import { Component, OnInit } from '@angular/core';
import { Reminder } from '../../models/reminder.model';
import { ReminderService } from '../../services/reminder.service';
import { DailyStatusService } from '../../services/daily-status.service'; // Import DailyStatusService
import { CommonModule } from '@angular/common';
import { IonicModule, NavController, AlertController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reminder-list',
  templateUrl: './reminder-list.component.html', // Adjusted to .component.html
  styleUrls: ['./reminder-list.component.scss'], // Adjusted to .component.scss
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ReminderListPage implements OnInit {
  reminders: Reminder[] = [];
  public completedTodayKeys: string[] = []; // Property to store completed keys

  constructor(
    private reminderService: ReminderService,
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private dailyStatusService: DailyStatusService // Inject DailyStatusService
  ) { }

  ngOnInit() {
    // loadReminders is called in ionViewWillEnter, which is usually sufficient
  }

  async ionViewWillEnter() {
    // Refresh reminders when the page is about to be entered
    await this.loadReminders();
    this.completedTodayKeys = this.dailyStatusService.getCompletedTodayKeys();
    console.log('Updated completedTodayKeys:', this.completedTodayKeys);
  }

  async loadReminders() {
    this.reminders = await this.reminderService.getReminders();
    console.log('Loaded reminders in page:', this.reminders);
  }

  goToAddReminderPage() {
    // We'll create this page in the next step
    this.navCtrl.navigateForward('/reminder-add');
  }

  goToEditReminderPage(reminderId: string) {
    this.navCtrl.navigateForward(`/reminder-add/${reminderId}`);
  }

  getFrequencyText(reminder: Reminder): string {
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    if (reminder.frequency === 'daily') {
      if (reminder.daysOfWeek && reminder.daysOfWeek.length > 0) {
        const selectedDayNames = reminder.daysOfWeek.map(d => dayNames[d]).join(', ');
        return `Diario (Días: ${selectedDayNames})`;
      }
      return 'Diario';
    } else if (reminder.frequency === 'weekly') {
      // Check if daysOfWeek represents Mon-Fri
      const isMonToFri = reminder.daysOfWeek &&
                         reminder.daysOfWeek.length === 5 &&
                         reminder.daysOfWeek.every((day, index) => day === index + 1);

      if (isMonToFri) {
        return 'Semanal (Lunes a Viernes)';
      } else if (reminder.daysOfWeek && reminder.daysOfWeek.length > 0) {
        // If daysOfWeek is present but not strictly Mon-Fri (e.g., legacy data or future changes)
        const selectedDayNames = reminder.daysOfWeek.map(d => dayNames[d]).join(', ');
        return `Semanal (Días: ${selectedDayNames})`;
      }
      // Fallback for 'weekly' if daysOfWeek is empty or doesn't match known patterns,
      // still implies Mon-Fri as per current app logic for new reminders.
      return 'Semanal (Lunes a Viernes)';
    }
    return 'Frecuencia no establecida';
  }

  isCompletedToday(reminderId: string): boolean {
    return this.completedTodayKeys.includes(reminderId);
  }

  async toggleCompletionToday(reminder: Reminder) {
    if (this.isCompletedToday(reminder.id)) {
      // Currently, we don't un-mark. If needed, logic would go here.
      console.log(`Reminder ${reminder.id} is already marked as completed today.`);
      return;
    }
    this.dailyStatusService.markAsCompletedToday(reminder.id);
    this.completedTodayKeys = this.dailyStatusService.getCompletedTodayKeys(); // Refresh keys
    console.log(`Marked ${reminder.id} as completed. New keys:`, this.completedTodayKeys);
    // TODO: Call ReminderService to cancel hourly notifications for reminder.id for today
  }

  async confirmDeleteReminder(reminderId: string, reminderText: string) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar Eliminación',
      message: `¿Estás seguro de que quieres eliminar el recordatorio "${reminderText}"? Esta acción no se puede deshacer.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            // console.log('Eliminación cancelada');
          }
        }, {
          text: 'Eliminar',
          cssClass: 'danger',
          handler: async () => {
            try {
              await this.reminderService.deleteReminder(reminderId);
              await this.loadReminders(); // Refresh the list
            } catch (error) {
              console.error('Error al eliminar el recordatorio:', error);
              const errorAlert = await this.alertCtrl.create({
                  header: 'Error',
                  message: 'No se pudo eliminar el recordatorio. Inténtalo de nuevo.',
                  buttons: ['OK']
              });
              await errorAlert.present();
            }
          }
        }
      ]
    });
    await alert.present();
  }
}
