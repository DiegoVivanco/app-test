import { Component } from '@angular/core';
import { IonicModule, Platform } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { ReminderService } from './services/reminder.service';
import { DailyStatusService } from './services/daily-status.service';
import { LocalNotifications, ILocalNotification } from '@ionic-native/local-notifications/ngx'; // Import LocalNotifications

@Component({
  selector: 'app-root',
  imports: [
    IonicModule,
    RouterModule
  ],
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  // public isCordova: boolean; // REMOVED

  constructor(
    private platform: Platform,
    private reminderService: ReminderService,
    private dailyStatusService: DailyStatusService,
    private localNotifications: LocalNotifications // Inject LocalNotifications
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      console.log('Platform is ready in AppComponent.');
      this.dailyStatusService.clearOldCompletedStatuses();
      console.log('Old daily completion statuses cleared on app startup.');
      this.reminderService.initializeNotifications();
      this.setupNotificationHandlers(); // Call to setup handlers
    });
  }

  async setupNotificationHandlers() {
    if (!this.platform.is('cordova')) {
      // this.isCordova = false; // REMOVED
      console.log('Not on Cordova, skipping setup of LocalNotification handlers.');
      return; // Return, do not attach listeners or expose debug functions.
    }
    // this.isCordova = true; // REMOVED

    this.localNotifications.on('trigger').subscribe(async (notification: ILocalNotification) => {
      console.log('Notification triggered:', JSON.stringify(notification));
      await this.handleNotificationTrigger(notification.data);
    });

    this.localNotifications.on('click').subscribe(async (notification: ILocalNotification) => {
      console.log('Notification clicked:', JSON.stringify(notification));
      // When a notification is clicked, mark it as completed today and cancel subsequent hourly ones.
      const reminderId = notification.data.reminderId;
      if (reminderId) {
        this.dailyStatusService.markAsCompletedToday(reminderId);
        // TODO: Check if ReminderListPage needs to be refreshed if it's the current view
        // This might require an event service or other state management to notify the page.
        await this.reminderService.cancelHourlyNotificationsForToday(reminderId);
        console.log(`Reminder ${reminderId} marked as complete, hourly notifications for today cancelled via click.`);
      }
      // Optional: navigate to a specific page or refresh current view
    });
  }

  private async handleNotificationTrigger(data: any) {
    const reminderId = data.reminderId;
    const notificationType = data.type;

    if (!reminderId) {
      console.error('Notification data is missing reminderId.');
      return;
    }

    const reminder = await this.reminderService.getReminderById(reminderId); // Use getReminderById

    if (!reminder) {
      console.warn(`[WEB SIM] Recordatorio con ID ${reminderId} no encontrado en handleNotificationTrigger.`);
      return;
    }

    // The active day check and web-specific alert for initial notifications have been removed.
    // This method will only be called if on Cordova due to the guard in setupNotificationHandlers.

    // If an 'initial' notification is triggered and not yet completed today, schedule the first hourly.
    if (notificationType === 'initial' && !this.dailyStatusService.isCompletedToday(reminderId)) {
      if (!reminder.enabled) {
        console.log(`Reminder ${reminderId} is disabled. Not scheduling hourly.`);
        return;
      }

      const now = new Date();
      let nextHour = now.getHours() + 1;

      if (nextHour < 23) {
        const numericIdForHourly = this.reminderService.getNumericId(`${reminderId}-hourly-${nextHour}`);
        const hourlyNotif: ILocalNotification = {
          id: numericIdForHourly,
          title: reminder.text,
          text: `Recordatorio Horario (${nextHour}:00)`,
          trigger: { at: new Date(now.getFullYear(), now.getMonth(), now.getDate(), nextHour, 0, 0) },
          data: {
            reminderId: reminder.id,
            type: 'hourly',
            originalTime: reminder.time,
            hourOfDay: nextHour
          },
          foreground: true,
        };

        // This logic is now only for Cordova
        console.log('Cordova: Scheduling next hourly notification:', JSON.stringify(hourlyNotif));
        try {
          await this.localNotifications.cancel(hourlyNotif.id);
        } catch (e) {
          console.warn(`Could not cancel existing hourly notification ${hourlyNotif.id} before rescheduling:`, e);
        }
        await this.localNotifications.schedule(hourlyNotif);
      } else {
        console.log(`Next hour (${nextHour}) is too late, not scheduling next hourly for reminder ${reminderId}.`);
      }
    } else if (notificationType === 'hourly' && !this.dailyStatusService.isCompletedToday(reminderId)) {
      if (!reminder.enabled) {
        console.log(`Hourly: Reminder ${reminderId} is disabled. Not scheduling next.`);
        return;
      }

      const now = new Date();
      let nextHour = (data.hourOfDay || now.getHours()) + 1;

      if (nextHour < 23) {
        const numericIdForHourly = this.reminderService.getNumericId(`${reminderId}-hourly-${nextHour}`);
        const hourlyNotif: ILocalNotification = {
          id: numericIdForHourly,
          title: reminder.text,
          text: `Recordatorio Horario (${nextHour}:00)`,
          trigger: { at: new Date(now.getFullYear(), now.getMonth(), now.getDate(), nextHour, 0, 0) },
          data: {
            reminderId: reminder.id,
            type: 'hourly',
            originalTime: reminder.time,
            hourOfDay: nextHour
          },
          foreground: true,
        };

        // This logic is now only for Cordova
        console.log('Cordova: Scheduling next subsequent hourly notification:', JSON.stringify(hourlyNotif));
        try { await this.localNotifications.cancel(hourlyNotif.id); } catch (e) {}
        await this.localNotifications.schedule(hourlyNotif);
      } else {
         console.log(`Next hour (${nextHour}) is too late, not scheduling next hourly for reminder ${reminderId}.`);
      }
    }
  }
}
