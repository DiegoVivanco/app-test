import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { ReminderService } from './services/reminder.service'; // Ensure path is correct

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private reminderService: ReminderService
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      console.log('Platform is ready in AppComponent.');
      // No need to check platform.is('cordova') here, ReminderService will do it.
      // ReminderService's initializeNotifications will handle platform checks.
      this.reminderService.initializeNotifications();
    });
  }
}
