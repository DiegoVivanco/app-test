import { Component, OnInit } from '@angular/core';
import { Reminder } from '../../models/reminder.model';
import { ReminderService } from '../../services/reminder.service';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController, AlertController } from '@ionic/angular'; // Import AlertController
import { FormsModule } from '@angular/forms'; // Required for standalone components using ngModel, etc.

@Component({
  selector: 'app-reminder-list',
  templateUrl: './reminder-list.component.html', // Adjusted to .component.html
  styleUrls: ['./reminder-list.component.scss'], // Adjusted to .component.scss
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class ReminderListPage implements OnInit { // Class name is ReminderListPage as per instructions
  reminders: Reminder[] = [];

  constructor(
    private reminderService: ReminderService,
    private navCtrl: NavController,
    private alertCtrl: AlertController // Inject AlertController
  ) { }

  ngOnInit() {
    this.loadReminders();
  }

  ionViewWillEnter() {
    // Refresh reminders when the page is about to be entered
    this.loadReminders();
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
