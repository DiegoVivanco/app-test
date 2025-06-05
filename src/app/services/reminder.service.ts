import { Injectable } from '@angular/core';
import { Reminder } from '../models/reminder.model';
import { v4 as uuidv4 } from 'uuid';
import { LocalNotifications, ILocalNotification } from '@ionic-native/local-notifications/ngx';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class ReminderService {
  private reminders: Reminder[] = [];

  constructor(
    private localNotifications: LocalNotifications,
    private platform: Platform
  ) {
    // Initialize with a sample reminder for testing (as per original service)
    // This will be scheduled if on Cordova platform when initializeNotifications is called
    this.reminders.push({
        id: uuidv4(),
        text: 'Tomar creatina (Ejemplo)',
        frequency: 'daily',
        time: '08:00',
        // optionalDays: [0, 6], // Sunday, Saturday // REMOVED
        enabled: true
    });
  }

  async initializeNotifications() {
    await this.platform.ready();
    console.log('Platform ready in ReminderService. Initializing notifications.');

    if (!this.platform.is('cordova')) {
      console.log('Not on Cordova, skipping notification scheduling logic in initializeNotifications.');
      return;
    }
    // Cordova-specific logic from here
    const hasPermission = await this.checkPermissions();
    if (hasPermission) {
      console.log('Notification permissions granted. Scheduling all notifications for Cordova.');
      await this.scheduleAllNotifications();
    } else {
      console.warn('Notification permissions not granted. Cannot schedule notifications for Cordova.');
    }
  }

  private async checkPermissions(): Promise<boolean> {
    // This method is only called if platform.is('cordova') is true due to the guard in initializeNotifications.
    // Thus, the inner check !this.platform.is('cordova') is theoretically not needed but kept for safety.
    if (!this.platform.is('cordova')) {
      console.warn('checkPermissions called unnecessarily for non-Cordova environment.');
      return false;
    }
    try {
      let hasPermission = await this.localNotifications.hasPermission();
      console.log('Has existing notification permission?', hasPermission);
      if (hasPermission) {
        return true;
      }
      // Request permission only if not already granted.
      // The plugin docs suggest requestPermission returns a boolean or resolves if successful
      // For some platforms it might return an object, so coercing to boolean.
      const permissionResult = await this.localNotifications.requestPermission();
      console.log('Permission request result:', permissionResult);
      return !!permissionResult;
    } catch (e) {
      console.error('Error checking/requesting notification permissions:', e);
      return false;
    }
  }

  private getNumericId(idPart: string): number { // Changed back to private
    let hash = 0;
    for (let i = 0; i < idPart.length; i++) {
      const char = idPart.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash % 2147483647); // Ensure positive and within typical int range
  }

  async scheduleNotification(reminder: Reminder) {
    if (!reminder.enabled) {
      console.log(`Reminder "${reminder.text}" is disabled. No notifications will be scheduled.`);
      return;
    }

    // This method will now only contain Cordova-specific logic.
    // The web simulation alerts have been removed from here.

    // Cordova-specific logic
    if (!this.platform.is('cordova')) {
      // This block should ideally not be reached if initializeNotifications and other callers handle platform checks.
      // However, as a safeguard or if called directly:
      console.warn('scheduleNotification called in non-Cordova context after initial checks, skipping plugin interaction.');
      return;
    }

    if (!reminder.time || !reminder.time.includes(':')) {
        console.error('Invalid time for reminder, cannot schedule:', JSON.stringify(reminder));
        return;
    }

    const [hour, minute] = reminder.time.split(':').map(Number);

    if (reminder.frequency === 'daily') {
      const numericId = this.getNumericId(reminder.id);
      // Always cancel before scheduling to avoid duplicates if logic is re-run
      try { await this.localNotifications.cancel(numericId); } catch (e) { /* ignore if not found */ }

      const notification: ILocalNotification = {
        id: numericId,
        title: 'Recordatorio',
        text: reminder.text,
        trigger: {
          every: { hour, minute }, // For daily, this means every day at this hour and minute
          count: 9999, // Effectively repeat indefinitely
        },
        data: { reminderId: reminder.id, type: 'initial' }, // Added type: 'initial'
        foreground: true
      };
      this.localNotifications.schedule(notification);
      console.log('Scheduled daily notification:', JSON.stringify(notification));

    } else if (reminder.frequency === 'weekly' && reminder.daysOfWeek && reminder.daysOfWeek.length > 0) {
      for (const day of reminder.daysOfWeek) {
        // Create a unique numeric ID for each day's notification for a weekly reminder
        const uniqueIdPartForDay = `${reminder.id.substring(0, 8)}-${day}`;
        const numericIdForDay = this.getNumericId(uniqueIdPartForDay);
        try { await this.localNotifications.cancel(numericIdForDay); } catch (e) { /* ignore if not found */ }

        const notification: ILocalNotification = {
          id: numericIdForDay,
          title: 'Recordatorio',
          text: reminder.text,
          trigger: {
            every: { weekday: day, hour, minute }, // Sunday is 0 in plugin, but JS Date.getDay() is also 0. Plugin uses 1-7 for days. Let's use plugin's convention.
                                                // The plugin documentation actually states:
                                                // weekday: Sunday is 1, Monday is 2 and so on.
                                                // Our daysOfWeekOptions is 0 for Sunday, 1 for Monday. So, we need to adjust.
            count: 9999
          },
          data: { reminderId: reminder.id, weekday: day + 1, type: 'initial' }, // Added type: 'initial'
          foreground: true
        };
        // Adjust day for plugin: daysOfWeek is 0 (Sun) to 6 (Sat). Plugin expects 1 (Sun) to 7 (Sat).
        if (notification.trigger && typeof notification.trigger.every !== 'string' && notification.trigger.every && notification.trigger.every.weekday !== undefined) {
            notification.trigger.every.weekday = day + 1;
        }

        this.localNotifications.schedule(notification);
        console.log('Scheduled weekly notification for original day ' + day + ' (plugin day ' + (day+1) + '):', JSON.stringify(notification));
      }
    } else {
      console.warn('Reminder frequency not supported or daysOfWeek missing for weekly:', JSON.stringify(reminder));
    }
  }

  async scheduleAllNotifications() {
    // This method is only called if on Cordova and permissions are granted (from initializeNotifications)
    // or if called in web mode where scheduleNotification will then just log alerts (now removed).
    // For clarity, this method should primarily focus on iterating and calling scheduleNotification.
    // The individual scheduleNotification will handle platform specifics.
    console.log('Scheduling all enabled reminders...');
    const reminders = await this.getReminders();
    for (const reminder of reminders) {
      if (reminder.enabled) {
        await this.scheduleNotification(reminder);
      } else {
        // Ensure any previously scheduled notifications for this reminder are cancelled if it's now disabled
        await this.cancelNotification(reminder);
      }
    }
  }

  async cancelNotification(reminder: Reminder) {
    // This method will now only contain Cordova-specific logic.
    // The web simulation alerts have been removed from here.
    if (!this.platform.is('cordova')) {
      // This block should ideally not be reached.
      console.warn('cancelNotification called in non-Cordova context after initial checks, skipping plugin interaction.');
      return;
    }

    // Cordova-specific logic
    console.log('Attempting to cancel notifications for reminder:', reminder.text, reminder.id);
    if (reminder.frequency === 'daily') {
        const numericId = this.getNumericId(reminder.id);
        try {
            await this.localNotifications.cancel(numericId);
            console.log('Cancelled daily notification for ID (numeric):', numericId);
        } catch (e) { console.error('Error cancelling daily notification:', numericId, e); }
    } else if (reminder.frequency === 'weekly' && reminder.daysOfWeek) {
        for (const day of reminder.daysOfWeek) {
            const uniqueIdPartForDay = `${reminder.id.substring(0, 8)}-${day}`;
            const numericIdForDay = this.getNumericId(uniqueIdPartForDay);
            try {
                await this.localNotifications.cancel(numericIdForDay);
                console.log('Cancelled weekly notification for original day ' + day + ', ID (numeric):', numericIdForDay);
            } catch (e) { console.error('Error cancelling weekly notification for day ' + day + ':', numericIdForDay, e); }
        }
    } else {
        console.log('Reminder does not have a frequency or days to cancel specific notifications:', JSON.stringify(reminder));
    }
  }

  async addReminder(reminderData: Omit<Reminder, 'id' | 'enabled'>): Promise<Reminder> {
    const newReminder: Reminder = {
      id: uuidv4(),
      ...reminderData,
      enabled: true, // New reminders are enabled by default
    };
    this.reminders.push(newReminder);
    if (newReminder.enabled && this.platform.is('cordova')) {
      await this.scheduleNotification(newReminder);
    }
    console.log('Added reminder:', newReminder.text, newReminder.id);
    // console.log('All reminders now:', this.reminders); // For debugging
    return newReminder;
  }

  async updateReminder(updatedReminder: Reminder): Promise<Reminder> {
    const index = this.reminders.findIndex(r => r.id === updatedReminder.id);
    if (index !== -1) {
      const oldReminderState = { ...this.reminders[index] }; // Capture state before update for cancellation logic
      this.reminders[index] = { ...updatedReminder };

      if (this.platform.is('cordova')) {
        // Cancel old notifications based on its previous state
        await this.cancelNotification(oldReminderState);
        // If the updated reminder is enabled, schedule new/updated notifications
        if (updatedReminder.enabled) {
          await this.scheduleNotification(updatedReminder);
        }
      }
      console.log('Updated reminder:', updatedReminder.text, updatedReminder.id);
      return updatedReminder;
    }
    console.error('Reminder not found for update with ID:', updatedReminder.id);
    throw new Error('Reminder not found for update');
  }

  async deleteReminder(id: string): Promise<void> {
    const reminderIndex = this.reminders.findIndex(r => r.id === id);
    if (reminderIndex !== -1) {
      const reminderToDelete = this.reminders[reminderIndex];
      if (this.platform.is('cordova')) {
        await this.cancelNotification(reminderToDelete);
      }
      this.reminders.splice(reminderIndex, 1);
      console.log('Deleted reminder and cancelled associated notifications for ID:', id);
    } else {
      console.log('Reminder not found for deletion with ID:', id);
    }
  }

  async getReminders(): Promise<Reminder[]> {
    // console.log('Getting reminders from service:', this.reminders); // For debugging
    return [...this.reminders]; // Return a copy
  }

  public getReminderById(id: string): Reminder | undefined {
    return this.reminders.find(r => r.id === id);
  }

  // isReminderDue is not directly related to notifications but part of the service's public API
  isReminderDue(reminder: Reminder, date: Date): boolean {
    if (!reminder.enabled) return false;
    const todayDay = date.getDay(); // Sunday - 0, Monday - 1, etc.

    if (reminder.frequency === 'daily') {
      // If specific days are set for a 'daily' reminder (e.g., daily but only weekdays)
      if (reminder.daysOfWeek && reminder.daysOfWeek.length > 0 && !reminder.daysOfWeek.includes(todayDay)) {
        return false; // Not active on this specific day
      }
      // For this function, if it's a daily reminder and not excluded by daysOfWeek, it's due.
      // Or if no daysOfWeek are specified at all for daily, it's also due.
      return true;
    } else if (reminder.frequency === 'weekly') {
      return !!(reminder.daysOfWeek && reminder.daysOfWeek.includes(todayDay));
    }
    return false;
  }

  async cancelHourlyNotificationsForToday(reminderId: string): Promise<void> {
    if (!this.platform.is('cordova')) {
      // This block should ideally not be reached if callers check platform first.
      console.warn('cancelHourlyNotificationsForToday called in non-Cordova context, skipping plugin interaction.');
      const reminder = this.reminders.find(r => r.id === reminderId); // Keep for potential console log
      const reminderText = reminder ? `"${reminder.text}"` : `ID: ${reminderId}`;
      console.log(`[WEB CONSOLE] Would cancel hourly for: ${reminderText} if alerts were still here.`);
      return;
    }

    console.log(`Cordova: Attempting to cancel hourly notifications for today for reminder ID: ${reminderId}`);
    // TODO: Implement actual Cordova logic to cancel multiple hourly notifications
    // This would involve:
    // 1. Determining the range of hours for "today" or relevant upcoming hours.
    // 2. Looping through these hours.
    // 3. Generating the specific numeric ID for each hourly notification, e.g., this.getNumericId(`${reminderId}-hourly-${hour}`).
    // 4. Calling await this.localNotifications.cancel(hourlyNumericId); for each.
    // Example:
    // const currentHour = new Date().getHours();
    // for (let hour = currentHour; hour < 24; hour++) {
    //   const hourlyNumericId = this.getNumericId(`${reminderId}-hourly-${hour}`);
    //   try {
    //     await this.localNotifications.cancel(hourlyNumericId);
    //     console.log(`Cancelled hourly notification ID ${hourlyNumericId} for hour ${hour}`);
    //   } catch (e) {
    //     // console.warn(`Could not cancel hourly notification ID ${hourlyNumericId} for hour ${hour}`, e);
    //   }
    // }
    // For now, as per subtask, only the web fallback is implemented.
    return Promise.resolve();
  }
}
