import { Injectable } from '@angular/core';
import { Reminder } from '../models/reminder.model';
import { v4 as uuidv4 } from 'uuid';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Platform } from '@ionic/angular';
import { Subject } from 'rxjs';
import { Preferences } from '@capacitor/preferences';

@Injectable({
  providedIn: 'root'
})
export class ReminderService {
  private reminders: Reminder[] = [];
  private requestConfirmCompletionSource = new Subject<{ reminderId: string, reminderText: string }>();
  public requestConfirmCompletion$ = this.requestConfirmCompletionSource.asObservable();

  constructor(private platform: Platform) {
    // El constructor ahora será más ligero.
    // La inicialización principal se hará en initializeNotifications.
  }

  private async _loadRemindersFromStorage(): Promise<void> {
    try {
      const storedReminders = await Preferences.get({ key: 'reminders' });
      if (storedReminders && storedReminders.value) {
        this.reminders = JSON.parse(storedReminders.value);
        console.log('Recordatorios cargados desde el almacenamiento:', this.reminders);
      } else {
        // No hay recordatorios guardados, podríamos inicializar con una lista vacía
        // o con el recordatorio de ejemplo (esto se manejará en el ajuste del constructor).
        this.reminders = [];
        console.log('No se encontraron recordatorios en el almacenamiento, inicializando lista vacía.');
      }
    } catch (error) {
      console.error('Error al cargar recordatorios desde el almacenamiento:', error);
      this.reminders = []; // En caso de error, empezar con lista vacía
    }
  }

  private async _saveRemindersToStorage(): Promise<void> {
    try {
      await Preferences.set({
        key: 'reminders',
        value: JSON.stringify(this.reminders)
      });
      console.log('Recordatorios guardados en el almacenamiento.');
    } catch (error) {
      console.error('Error al guardar recordatorios en el almacenamiento:', error);
    }
  }

  async initializeNotifications() {
    await this.platform.ready(); // Asegurar que la plataforma está lista

    // 1. Cargar recordatorios desde el almacenamiento
    await this._loadRemindersFromStorage();

    if (this.reminders.length === 0) {
      console.log('No hay recordatorios cargados, añadiendo recordatorio de ejemplo.');
      const now = new Date();
      now.setMinutes(now.getMinutes() + 1); // Ejemplo: 5 minutos en el futuro
      const hour = now.getHours().toString().padStart(2, '0');
      const minute = now.getMinutes().toString().padStart(2, '0');

      const exampleReminder: Reminder = {
        id: uuidv4(),
        text: 'Tomar creatina (Ejemplo)',
        frequency: 'weekly',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Todos los días para el ejemplo
        time: `${hour}:${minute}`,
        enabled: true,
        insistenceInterval: 1
      };
      this.reminders.push(exampleReminder);
      await this._saveRemindersToStorage();
    }

    // 3. Registrar permisos y tipos de acciones
    const permResult = await LocalNotifications.requestPermissions();
    if (permResult.display === 'granted') {
      const reminderActionTypes = {
        types: [
          {
            id: 'REMINDER_ACTIONS', // Un ID para este conjunto de acciones
            actions: [
              {
                id: 'snooze', // ID para la acción de posponer
                title: 'Posponer',
                // Considerar foreground: false para iOS si queremos que no abra la app
              },
              {
                id: 'mark_done', // ID para la acción de marcar como completada
                title: 'Completada',
              }
            ]
          }
        ]
      };

      try {
        await LocalNotifications.registerActionTypes(reminderActionTypes);
        console.log('Tipos de acciones de recordatorio registradas');
      } catch (error) {
        console.error('Error al registrar tipos de acciones de recordatorio', error);
      }

      await this.scheduleAllNotifications();

      LocalNotifications.addListener('localNotificationActionPerformed', async (notificationAction) => {
        console.log('Notification action performed:', notificationAction);
        const actionId = notificationAction.actionId;
        const { reminderId, insistenceInterval } = notificationAction.notification.extra;

        if (actionId === 'mark_done') {
          console.log(`Recordatorio ${reminderId} solicitando confirmación para marcar como completado.`);
          if (reminderId) {
            const reminder = this.getReminderById(reminderId);
            if (reminder) {
              this.requestConfirmCompletionSource.next({ reminderId, reminderText: reminder.text });
              return;
            } else {
              console.warn(`Recordatorio con ID ${reminderId} no encontrado al intentar confirmar compleción.`);
              return;
            }
          } else {
            console.warn(`No se proporcionó reminderId para la acción mark_done.`);
            return;
          }
        } else if (actionId === 'snooze' || actionId === 'tap') {
          if (reminderId && typeof insistenceInterval === 'number' && insistenceInterval > 0) {
            const reminder = this.getReminderById(reminderId);

            if (reminder && reminder.enabled) {
              const newTime = new Date().getTime() + insistenceInterval * 60 * 1000;
              const newNotificationId = this.getNumericId(`${reminder.id}-insist-${Date.now()}`);

              const newNotificationConfig: any = { // Use 'any' or define a more specific type if available/needed
                id: newNotificationId,
                title: reminder.text,
                body: `Insistencia: ${reminder.text}`,
                schedule: { at: new Date(newTime) },
                extra: { ...notificationAction.notification.extra },
                actionTypeId: 'REMINDER_ACTIONS',
                sound: this.platform.is('ios') ? 'beep.wav' : undefined // Or your specific sound file, conditional for iOS
                // For Android, default sound is usually played. 'sound' property might behave differently or rely on channel settings.
              };

              // Ensure sound is explicitly set for iOS if using a custom sound file.
              // If 'beep.wav' is not a file in native resources, Capacitor might use default.
              // For default sound, it might be better to omit `sound` or use `sound: 'default'` if supported.
              // Let's assume 'beep.wav' is a known sound or we rely on default if not found.

              try {
                await LocalNotifications.schedule({ notifications: [newNotificationConfig] });
                console.log(`Scheduled insisted notification for reminder ${reminderId} (action: ${actionId}) at ${new Date(newTime)}`);
              } catch (e) {
                console.error('Error scheduling insisted notification', e);
              }
            } else {
              console.log(`Reminder ${reminderId} not found or not enabled for insistence (action: ${actionId}).`);
            }
          } else {
            console.log(`No valid reminderId or insistenceInterval for actioned notification (action: ${actionId}).`);
          }
        } else {
          console.log(`Acción desconocida o no manejada: ${actionId}`);
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
        extra: { reminderId: reminder.id, insistenceInterval: reminder.insistenceInterval ?? 30 },
        actionTypeId: 'REMINDER_ACTIONS'
      });
    }

    if (reminder.frequency === 'weekly' && reminder.daysOfWeek?.length) {
      for (const day of reminder.daysOfWeek) {
        notifications.push({
          id: this.getNumericId(`${reminder.id}-${day}`),
          title: 'Recordatorio',
          body: reminder.text,
          schedule: { on: { weekday: day + 1, hour, minute, repeats: true } },
          extra: { reminderId: reminder.id, weekday: day + 1, insistenceInterval: reminder.insistenceInterval ?? 30 },
          actionTypeId: 'REMINDER_ACTIONS'
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
    await this._saveRemindersToStorage();
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
    await this._saveRemindersToStorage();
    return this.reminders[i];
  }

  async deleteReminder(id: string): Promise<void> {
    const index = this.reminders.findIndex(r => r.id === id);
    if (index !== -1) {
      await this.cancelNotification(this.reminders[index]);
      this.reminders.splice(index, 1);
      await this._saveRemindersToStorage();
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

  public confirmReminderCompleted(reminderId: string): void {
    console.log(`ReminderService: Recordatorio ${reminderId} confirmado como completado por el usuario.`);
    // Aquí iría la lógica adicional, como llamar a DailyStatusService si existiera.
    // Ejemplo: if (this.dailyStatusService) { this.dailyStatusService.markAsCompleted(reminderId); }
    // Por ahora, solo el log.
  }

  public reminderCompletionCancelled(reminderId: string): void {
    console.log(`ReminderService: Completar recordatorio ${reminderId} fue cancelado por el usuario.`);
    // Aquí podría ir lógica futura si queremos reprogramar o hacer algo específico al cancelar.
  }
}
