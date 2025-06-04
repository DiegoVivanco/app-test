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
    { val: 0, name: 'Sunday', isChecked: false },
    { val: 1, name: 'Monday', isChecked: false },
    { val: 2, name: 'Tuesday', isChecked: false },
    { val: 3, name: 'Wednesday', isChecked: false },
    { val: 4, name: 'Thursday', isChecked: false },
    { val: 5, name: 'Friday', isChecked: false },
    { val: 6, name: 'Saturday', isChecked: false }
  ];
  optionalDaysOptions = JSON.parse(JSON.stringify(this.daysOfWeekOptions)); // Deep copy

  constructor(
    private fb: FormBuilder,
    private reminderService: ReminderService,
    private navCtrl: NavController,
    private route: ActivatedRoute
  ) {
    this.reminderForm = this.fb.group({
      text: ['', Validators.required],
      time: ['', Validators.required],
      frequency: ['daily', Validators.required],
      // daysOfWeek will be populated based on checkboxes
      // optionalDays will be populated based on checkboxes
    });
  }

  ngOnInit() {
    this.reminderId = this.route.snapshot.paramMap.get('id');
    if (this.reminderId) {
      this.isEditMode = true;
      this.loadReminderData(this.reminderId);
    }
  }

  async loadReminderData(id: string) {
    const reminders = await this.reminderService.getReminders(); // In a real app, getReminderById(id)
    const reminder = reminders.find(r => r.id === id);
    if (reminder) {
      this.reminderForm.patchValue({
        text: reminder.text,
        time: reminder.time,
        frequency: reminder.frequency,
      });
      if (reminder.daysOfWeek) {
        this.daysOfWeekOptions.forEach(opt => opt.isChecked = reminder.daysOfWeek!.includes(opt.val));
      }
      if (reminder.optionalDays) {
        this.optionalDaysOptions.forEach(opt => opt.isChecked = reminder.optionalDays!.includes(opt.val));
      }
    }
  }

  async saveReminder() {
    if (this.reminderForm.invalid) {
      return;
    }

    const formValues = this.reminderForm.value;
    const selectedDaysOfWeek = this.daysOfWeekOptions.filter(opt => opt.isChecked).map(opt => opt.val);
    const selectedOptionalDays = this.optionalDaysOptions.filter(opt => opt.isChecked).map(opt => opt.val);

    const reminderData: Omit<Reminder, 'id' | 'enabled'> = {
      text: formValues.text,
      time: formValues.time,
      frequency: formValues.frequency,
      daysOfWeek: selectedDaysOfWeek.length > 0 ? selectedDaysOfWeek : undefined,
      optionalDays: selectedOptionalDays.length > 0 ? selectedOptionalDays : undefined,
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
