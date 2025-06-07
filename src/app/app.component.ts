import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonicModule, Platform, AlertController, ToastController } from '@ionic/angular'; // Added ToastController
import { RouterModule } from '@angular/router';
import { ReminderService } from './services/reminder.service';
import { Subscription } from 'rxjs'; // Added Subscription
import { DailyStatusService } from './services/daily-status.service';
import {
  LocalNotifications,
  LocalNotificationSchema,
} from '@capacitor/local-notifications';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    IonicModule,
    RouterModule
  ],
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy { // Implemented OnInit, OnDestroy
  private confirmCompletionSub: Subscription | undefined;

  constructor(
    private platform: Platform,
    private reminderService: ReminderService,
    private dailyStatusService: DailyStatusService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController // Injected ToastController
  ) {
    this.initializeApp();
  }

  async initializeApp() {
    await this.platform.ready();
    console.log('Platform is ready in AppComponent.');
    this.dailyStatusService.clearOldCompletedStatuses();
    console.log('Old daily completion statuses cleared on app startup.');
    await this.reminderService.initializeNotifications();
    this.setupNotificationHandlers();
  }

  setupNotificationHandlers() {
    LocalNotifications.addListener('localNotificationActionPerformed', async (event) => {
      const notification = event.notification;
      console.log('Notification clicked:', notification);
      const data = notification.extra;

      if (data?.reminderId) {
        this.dailyStatusService.markAsCompletedToday(data.reminderId);
        await this.reminderService.cancelHourlyNotificationsForToday(data.reminderId);
        console.log(`Reminder ${data.reminderId} marked as complete via click, hourly notifications cancelled.`);
      }
    });

    LocalNotifications.addListener('localNotificationReceived', async (notification) => {
      console.log('Notification triggered:', notification);
      await this.handleNotificationTrigger(notification.extra);
    });
  }

  ngOnInit() {
    this.confirmCompletionSub = this.reminderService.requestConfirmCompletion$.subscribe(
      ({ reminderId, reminderText }) => {
        this.presentConfirmCompleteAlert(reminderId, reminderText);
      }
    );
  }

  ngOnDestroy() {
    if (this.confirmCompletionSub) {
      this.confirmCompletionSub.unsubscribe();
    }
  }

  async presentConfirmCompleteAlert(reminderId: string, reminderText: string) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar Tarea',
      message: `¿Estás seguro de que quieres marcar como completada la tarea: "${reminderText}"?`,
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          handler: () => {
            console.log('Confirmación de completar cancelada para recordatorio:', reminderId);
            this.reminderService.reminderCompletionCancelled(reminderId);
          }
        },
        {
          text: 'Sí',
          handler: () => {
            console.log('Confirmado completar para recordatorio:', reminderId);
            this.reminderService.confirmReminderCompleted(reminderId);
            this.showTaskCompletedToast(reminderText);
          }
        }
      ],
      backdropDismiss: false // Evitar que se cierre al tocar fuera
    });
    await alert.present();
  }

  async showTaskCompletedToast(taskText: string) {
    const toast = await this.toastCtrl.create({
      message: `Tarea "${taskText}" completada.`,
      duration: 2000, // Duración de 2 segundos
      position: 'bottom', // Posición del toast
      color: 'success' // Color del toast
    });
    await toast.present();
  }

  private async handleNotificationTrigger(data: any) {
    const reminderId = data?.reminderId;
    const notificationType = data?.type;

    if (!reminderId) {
      console.error('Notification data is missing reminderId.');
      return;
    }

    const reminder = this.reminderService.getReminderById(reminderId);
    if (!reminder) {
      console.warn(`Reminder with ID ${reminderId} not found.`);
      return;
    }

    if (notificationType === 'initial' && !this.dailyStatusService.isCompletedToday(reminderId)) {
      if (!reminder.enabled) return;

      const now = new Date();
      const nextHour = now.getHours() + 1;
      if (nextHour < 23) {
        const numericId = this.reminderService.getNumericId(`${reminderId}-hourly-${nextHour}`);
        const notif: LocalNotificationSchema = {
          id: numericId,
          title: reminder.text,
          body: `Recordatorio Horario (${nextHour}:00)`,
          schedule: {
            at: new Date(now.getFullYear(), now.getMonth(), now.getDate(), nextHour, 0, 0),
          },
          extra: {
            reminderId: reminder.id,
            type: 'hourly',
            hourOfDay: nextHour,
          }
        };
        await LocalNotifications.schedule({ notifications: [notif] });
        console.log('Scheduled next hourly notification.');
      }

    } else if (notificationType === 'hourly' && !this.dailyStatusService.isCompletedToday(reminderId)) {
      if (!reminder.enabled) return;

      const now = new Date();
      const nextHour = (data?.hourOfDay ?? now.getHours()) + 1;
      if (nextHour < 23) {
        const numericId = this.reminderService.getNumericId(`${reminderId}-hourly-${nextHour}`);
        const notif: LocalNotificationSchema = {
          id: numericId,
          title: reminder.text,
          body: `Recordatorio Horario (${nextHour}:00)`,
          schedule: {
            at: new Date(now.getFullYear(), now.getMonth(), now.getDate(), nextHour, 0, 0),
          },
          extra: {
            reminderId: reminder.id,
            type: 'hourly',
            hourOfDay: nextHour,
          }
        };
        await LocalNotifications.schedule({ notifications: [notif] });
        console.log('Scheduled next subsequent hourly notification.');
      }
    }
  }
}
