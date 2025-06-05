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
  public isCordova: boolean; // For template access

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
      this.isCordova = false; // Set for template
      console.log('[WEB SIM] Cordova LocalNotifications not available. Event listeners not attached.');
      // Expose a debug function for web testing of notification handling
      (window as any).simulateNotificationTrigger = (simulatedData: any) => {
        console.log('[WEB SIM] Manually simulating notification trigger with data:', simulatedData);
        this.handleNotificationTrigger(simulatedData).catch(error => {
            console.error('[WEB SIM] Error in simulated handleNotificationTrigger:', error);
        });
      };
      console.log('[WEB SIM] To test notification chaining, call "window.simulateNotificationTrigger({ reminderId: \'your-reminder-id\', type: \'initial\' })" or "window.simulateNotificationTrigger({ reminderId: \'your-reminder-id\', type: \'hourly\', hourOfDay: HH })" in the console.');
      return; // Still return, as we don't want to attach actual plugin listeners.
    }
    this.isCordova = true; // Set for template

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

    // Active day check for 'initial' type simulations in web mode
    if (notificationType === 'initial' && !this.platform.is('cordova')) {
      const now = new Date();
      const currentDayOfWeek = now.getDay(); // 0 for Sunday, 1 for Monday...
      let isDueToday = false;
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']; // Local day names

      if (reminder.frequency === 'daily') {
        isDueToday = (!reminder.daysOfWeek || reminder.daysOfWeek.length === 0 || reminder.daysOfWeek.includes(currentDayOfWeek));
      } else if (reminder.frequency === 'weekly') {
        isDueToday = reminder.daysOfWeek ? reminder.daysOfWeek.includes(currentDayOfWeek) : false;
      }

      if (!isDueToday) {
        const reminderDays = reminder.daysOfWeek ? reminder.daysOfWeek.map(d => dayNames[d]).join(', ') : 'No especificado';
        alert(`[WEB SIM] Notificación Inicial Ignorada (Simulada):
Recordatorio: "${reminder.text}"
Programado para: ${reminder.frequency === 'weekly' ? 'Semanalmente los ' + reminderDays : 'Diariamente'} a las ${reminder.time}.
Hoy (${dayNames[currentDayOfWeek]}) no es un día activo.`);
        return; // Stop processing this simulated trigger
      }
    }

    // If an 'initial' notification is triggered and not yet completed today, schedule the first hourly.
    // This check now also implicitly benefits from the 'reminder' object being available.
    if (notificationType === 'initial' && !this.dailyStatusService.isCompletedToday(reminderId)) {
      if (!reminder.enabled) { // Reminder object is already fetched
        console.log(`Reminder ${reminderId} is disabled. Not scheduling hourly.`);
        return;
      }

      const now = new Date();
      let nextHour = now.getHours() + 1;
      // const nextHour = new Date(now.getTime() + 10 * 1000).getSeconds(); // For quick testing: next 10 seconds

      if (nextHour < 23) { // Assuming we don't want to schedule past 11 PM for "hourly"
        // Construct the next hourly notification
        const numericIdForHourly = this.reminderService.getNumericId(`${reminderId}-hourly-${nextHour}`); // getNumericId needs to be public in ReminderService or duplicated
        const hourlyNotif: ILocalNotification = {
          id: numericIdForHourly,
          title: reminder.text, // Original reminder text as title
          text: `Recordatorio Horario (${nextHour}:00)`,
          trigger: { at: new Date(now.getFullYear(), now.getMonth(), now.getDate(), nextHour, 0, 0) },
          // trigger: { at: new Date(Date.now() + 10000) }, // For quick testing
          data: {
            reminderId: reminder.id,
            type: 'hourly', // Mark this as an hourly notification
            originalTime: reminder.time, // Keep original time for context if needed
            hourOfDay: nextHour
          },
          foreground: true,
        };

        if (this.platform.is('cordova')) {
          console.log('Cordova: Scheduling next hourly notification:', JSON.stringify(hourlyNotif));
          try {
            // It's good practice to cancel any existing notification with the same ID before scheduling a new one
            // This handles cases where an hourly notification might have been scheduled previously for this hour
            await this.localNotifications.cancel(hourlyNotif.id);
          } catch (e) {
            // Ignore if not found or log
            console.warn(`Could not cancel existing hourly notification ${hourlyNotif.id} before rescheduling:`, e);
          }
          await this.localNotifications.schedule(hourlyNotif);
        } else {
          // Web fallback
          const reminderText = reminder ? reminder.text : `ID: ${reminderId}`;
          alert(`[WEB SIM] Programar Siguiente Notif. Horaria:
Recordatorio: ${reminderText}
Para las: ${nextHour}:00
ID Numérico: ${hourlyNotif.id}
Tipo: hourly`);
        }
      } else {
        console.log(`Next hour (${nextHour}) is too late, not scheduling next hourly for reminder ${reminderId}.`);
      }
    } else if (notificationType === 'hourly' && !this.dailyStatusService.isCompletedToday(reminderId)) {
      // Logic for subsequent hourly notifications
      // Reminder object is already fetched and known to exist from the top of the function.
      if (!reminder.enabled) {
        console.log(`Hourly: Reminder ${reminderId} is disabled. Not scheduling next.`);
        return;
      }

      const now = new Date();
      let nextHour = (data.hourOfDay || now.getHours()) + 1; // Use hour from data if available, else current + 1

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

        if (this.platform.is('cordova')) {
          console.log('Cordova: Scheduling next subsequent hourly notification:', JSON.stringify(hourlyNotif));
           try { await this.localNotifications.cancel(hourlyNotif.id); } catch (e) {}
          await this.localNotifications.schedule(hourlyNotif);
        } else {
          const reminderText = reminder ? reminder.text : `ID: ${reminderId}`;
          alert(`[WEB SIM] Programar Siguiente Notif. Horaria (desde horaria):
Recordatorio: ${reminderText}
Para las: ${nextHour}:00
ID Numérico: ${hourlyNotif.id}
Tipo: hourly`);
        }
      } else {
         console.log(`Next hour (${nextHour}) is too late, not scheduling next hourly for reminder ${reminderId}.`);
      }
    }
  }
}
