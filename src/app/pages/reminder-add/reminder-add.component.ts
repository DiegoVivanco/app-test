import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NavController, IonicModule } from '@ionic/angular';
import { Reminder } from '../../models/reminder.model';
import { ReminderService } from '../../services/reminder.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reminder-add',
  templateUrl: './reminder-add.component.html', // Corrected to component.html
  styleUrls: ['./reminder-add.component.scss'],   // Corrected to component.scss
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule]
})
export class ReminderAddPage implements OnInit { // Class name as per instruction
  reminderForm: FormGroup;
  isEditMode = false;
  reminderId: string | null = null;
  daysOfWeekOptions = [
    { val: 0, name: 'Domingo', isChecked: false },
    { val: 1, name: 'Lunes', isChecked: false },
    { val: 2, name: 'Martes', isChecked: false },
    { val: 3, name: 'Miércoles', isChecked: false },
    { val: 4, name: 'Jueves', isChecked: false },
    { val: 5, name: 'Viernes', isChecked: false },
    { val: 6, name: 'Sábado', isChecked: false }
  ];

  constructor(
    private fb: FormBuilder,
    private reminderService: ReminderService,
    private navCtrl: NavController,
    private route: ActivatedRoute
  ) {
    this.reminderForm = this.fb.group({
      text: ['', Validators.required],
      time: ['', Validators.required],
      frequency: ['weekly', Validators.required], // Default to weekly
      insistenceInterval: [30, [Validators.required, Validators.min(1)]]
      // daysOfWeek will be populated based on checkboxes
      // optionalDays will be populated based on checkboxes
    });

    // Subscribe to frequency changes
    this.reminderForm.get('frequency')?.valueChanges.subscribe(frequencyValue => {
      this.updateDaysOfWeekForFrequency(frequencyValue);
    });
  }

  ngOnInit() {
    // Set initial default days for 'weekly' frequency
    if (!this.isEditMode) { // Only apply default for new reminders
      this.updateDaysOfWeekForFrequency('weekly');
    }

    this.reminderId = this.route.snapshot.paramMap.get('id');
    if (this.reminderId) {
      this.isEditMode = true;
      this.loadReminderData(this.reminderId);
    }
  }

  updateDaysOfWeekForFrequency(frequencyValue: string) {
    if (frequencyValue === 'weekly') {
      this.daysOfWeekOptions.forEach(opt => {
        // Monday to Friday (1-5)
        opt.isChecked = opt.val >= 1 && opt.val <= 5;
      });
    } else if (frequencyValue === 'daily') {
      this.daysOfWeekOptions.forEach(opt => {
        opt.isChecked = false; // Uncheck all for daily
      });
    }
  }

  async loadReminderData(id: string) {
    const reminders = await this.reminderService.getReminders();
    const reminder = reminders.find(r => r.id === id);
    if (reminder) {
      this.reminderForm.patchValue({
        text: reminder.text,
        time: reminder.time,
        frequency: reminder.frequency, // This will trigger valueChanges if different from current
        insistenceInterval: reminder.insistenceInterval ?? 30
      });

      // Critically, ensure loaded reminder's daysOfWeek take precedence
      if (reminder.daysOfWeek && reminder.daysOfWeek.length > 0) {
        this.daysOfWeekOptions.forEach(opt => {
          opt.isChecked = reminder.daysOfWeek!.includes(opt.val);
        });
      } else if (reminder.frequency === 'daily') { // If daily and no specific days, ensure all are unchecked
        this.daysOfWeekOptions.forEach(opt => {
          opt.isChecked = false;
        });
      }
      // Note: if frequency was weekly but no daysOfWeek were saved, it might default to Mon-Fri
      // due to valueChanges. If the desired behavior is to have no days checked if reminder.daysOfWeek is empty
      // even for weekly, then an explicit else if (reminder.frequency === 'weekly' && (!reminder.daysOfWeek || reminder.daysOfWeek.length === 0))
      // would be needed here to uncheck all. For now, assume default Mon-Fri is acceptable if daysOfWeek is empty for weekly.

    }
  }

  async saveReminder() {
    if (this.reminderForm.invalid) {
      return;
    }

    const formValues = this.reminderForm.value;
    const selectedDaysOfWeek = this.daysOfWeekOptions.filter((opt:any) => opt.isChecked).map((opt:any) => opt.val);

    const reminderData: Omit<Reminder, 'id' | 'enabled'> & { insistenceInterval?: number } = {
      text: formValues.text,
      time: formValues.time,
      frequency: formValues.frequency,
      daysOfWeek: selectedDaysOfWeek.length > 0 ? selectedDaysOfWeek : undefined,
      insistenceInterval: formValues.insistenceInterval
    };

    if (this.isEditMode && this.reminderId) {
      // Retrieve the existing reminder to preserve its 'enabled' status, or assume it should be enabled.
      // The current service update logic doesn't allow partial updates that preserve 'enabled' status easily
      // unless we fetch the reminder first. For simplicity, we'll assume it remains/becomes enabled.
      const existingReminders = await this.reminderService.getReminders();
      const existingReminder = existingReminders.find(r => r.id === this.reminderId);
      const currentEnabledStatus = existingReminder ? existingReminder.enabled : true;

      await this.reminderService.updateReminder({ ...reminderData, id: this.reminderId, enabled: currentEnabledStatus });
    } else {
      await this.reminderService.addReminder(reminderData);
    }
    this.navCtrl.navigateBack('/reminder-list');
  }
}
