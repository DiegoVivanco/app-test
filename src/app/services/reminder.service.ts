import { Injectable } from '@angular/core';
import { Reminder } from '../models/reminder.model';
import { v4 as uuidv4 } from 'uuid';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class ReminderService {
  private reminders: Reminder[] = [];

  constructor(private platform: Platform) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 2);
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');

    this.reminders.push({
      id: uuidv4(),
      text: 'Tomar creatina (Ejemplo)',
      frequency: 'weekly',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      time: `${hour}:${minute}`,
      enabled: true,
      insistenceInterval: 15
    });
  }

  async initializeNotifications() {
    await this.platform.ready();
    const permResult = await LocalNotifications.requestPermissions();
    if (permResult.display === 'granted') {
      await this.scheduleAllNotifications();

      LocalNotifications.addListener('localNotificationActionPerformed', async (notificationAction) => {
        console.log('Notification action performed:', notificationAction);

        const { reminderId, insistenceInterval } = notificationAction.notification.extra;

        if (reminderId && typeof insistenceInterval === 'number' && insistenceInterval > 0) {
          const reminder = this.getReminderById(reminderId);

          if (reminder && reminder.enabled) {
            const newTime = new Date().getTime() + insistenceInterval * 60 * 1000;
            const newNotificationId = this.getNumericId(`${reminder.id}-insist-${Date.now()}`);

            const newNotificationConfig = {
              id: newNotificationId,
              title: reminder.text, // Using reminder.text as title for more context, or use a generic 'Recordatorio'
              body: `Insistencia: ${reminder.text}`, // Or just reminder.text
              schedule: { at: new Date(newTime) },
              extra: { ...notificationAction.notification.extra }, // Preserve original extra, including reminderId and insistenceInterval
            };

            try {
              await LocalNotifications.schedule({ notifications: [newNotificationConfig] });
              console.log(`Scheduled insisted notification for reminder ${reminderId} at ${new Date(newTime)}`);
            } catch (e) {
              console.error('Error scheduling insisted notification', e);
            }
          } else {
            console.log(`Reminder ${reminderId} not found or not enabled for insistence.`);
          }
        } else {
          console.log('No valid reminderId or insistenceInterval for actioned notification.');
        }
      });
    } else {
      console.warn('No permission for local notifications');
    }
  }

  public getNumericId(idPart: string): number {
    let hash = 0;
    for (let i = 0; i < idPart.length; i++) {
      const char = idPart.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash % 2147483647);
  }

  async scheduleNotification(reminder: Reminder) {
    if (!reminder.enabled || !reminder.time?.includes(':')) return;

    const [hour, minute] = reminder.time.split(':').map(Number);

    const notifications = [];

    if (reminder.frequency === 'daily') {
      notifications.push({
        id: this.getNumericId(reminder.id),
        title: 'Recordatorio',
        body: reminder.text,
        schedule: { on: { hour, minute, repeats: true } },
        extra: { reminderId: reminder.id, insistenceInterval: reminder.insistenceInterval ?? 30 }
      });
    }

    if (reminder.frequency === 'weekly' && reminder.daysOfWeek?.length) {
      for (const day of reminder.daysOfWeek) {
        notifications.push({
          id: this.getNumericId(`${reminder.id}-${day}`),
          title: 'Recordatorio',
          body: reminder.text,
          schedule: { on: { weekday: day + 1, hour, minute, repeats: true } },
          extra: { reminderId: reminder.id, weekday: day + 1, insistenceInterval: reminder.insistenceInterval ?? 30 }
        });
      }
    }

    if (notifications.length) {
      await LocalNotifications.schedule({ notifications });
    }
  }

  async scheduleAllNotifications() {
    for (const r of this.reminders) {
      r.enabled ? await this.scheduleNotification(r) : await this.cancelNotification(r);
    }
  }

  async cancelNotification(reminder: Reminder) {
    const ids = [];
    if (reminder.frequency === 'daily') {
      ids.push(this.getNumericId(reminder.id));
    }
    if (reminder.frequency === 'weekly') {
      ids.push(...(reminder.daysOfWeek || []).map(d => this.getNumericId(`${reminder.id}-${d}`)));
    }
    if (ids.length) {
      await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
    }
  }

  async addReminder(data: Omit<Reminder, 'id' | 'enabled'>): Promise<Reminder> {
    const r: Reminder = {
      ...data,
      id: uuidv4(),
      enabled: true,
      insistenceInterval: data.insistenceInterval ?? 30
    };
    this.reminders.push(r);
    await this.scheduleNotification(r);
    return r;
  }

  async updateReminder(updated: Reminder): Promise<Reminder> {
    const i = this.reminders.findIndex(r => r.id === updated.id);
    if (i === -1) throw new Error('Reminder not found');
    const old = { ...this.reminders[i] };
    this.reminders[i] = {
      ...updated,
      insistenceInterval: updated.insistenceInterval ?? 30
    };
    await this.cancelNotification(old);
    if (this.reminders[i].enabled) await this.scheduleNotification(this.reminders[i]);
    return this.reminders[i];
  }

  async deleteReminder(id: string): Promise<void> {
    const index = this.reminders.findIndex(r => r.id === id);
    if (index !== -1) {
      await this.cancelNotification(this.reminders[index]);
      this.reminders.splice(index, 1);
    }
  }

  async getReminders(): Promise<Reminder[]> {
    return [...this.reminders];
  }

  getReminderById(id: string): Reminder | undefined {
    return this.reminders.find(r => r.id === id);
  }

  isReminderDue(reminder: Reminder, date: Date): boolean {
    if (!reminder.enabled) return false;
    const today = date.getDay();
    if (reminder.frequency === 'daily') {
      return !reminder.daysOfWeek?.length || reminder.daysOfWeek.includes(today);
    } else if (reminder.frequency === 'weekly') {
      return reminder.daysOfWeek?.includes(today) || false;
    }
    return false;
  }

  async cancelHourlyNotificationsForToday(reminderId: string): Promise<void> {
    console.warn('cancelHourlyNotificationsForToday not implemented');
    return Promise.resolve();
  }
}
