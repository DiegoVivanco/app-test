import { Component, OnInit } from '@angular/core';
import { Reminder } from '../../models/reminder.model';
import { ReminderService } from '../../services/reminder.service';
import { CommonModule } from '@angular/common';
import { IonicModule, NavController } from '@ionic/angular';
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
    private navCtrl: NavController
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
    if (reminder.frequency === 'daily') {
      let text = 'Diario';
      if (reminder.daysOfWeek && reminder.daysOfWeek.length < 7 && reminder.daysOfWeek.length > 0) {
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        text += ` (${reminder.daysOfWeek.map(d => dayNames[d]).join(', ')})`;
      }
      if (reminder.optionalDays && reminder.optionalDays.length > 0) {
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        text += ` (Opcional en ${reminder.optionalDays.map(d => dayNames[d]).join(', ')})`;
      }
      return text;
    } else if (reminder.frequency === 'weekly') {
      if (reminder.daysOfWeek && reminder.daysOfWeek.length > 0) {
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        return `Semanalmente los ${reminder.daysOfWeek.map(d => dayNames[d]).join(', ')}`;
      }
      return 'Semanal (días específicos no establecidos)';
    }
    return 'Frecuencia no establecida';
  }
}
