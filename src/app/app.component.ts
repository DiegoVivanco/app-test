import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { Platform } from '@ionic/angular';
import { ReminderService } from './services/reminder.service';
import { DailyStatusService } from './services/daily-status.service'; // Import DailyStatusService

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
  constructor(
    private platform: Platform,
    private reminderService: ReminderService,
    private dailyStatusService: DailyStatusService // Inject DailyStatusService
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      console.log('Platform is ready in AppComponent.');
      this.dailyStatusService.clearOldCompletedStatuses(); // Clear old statuses
      console.log('Old daily completion statuses cleared on app startup.');
      // ReminderService's initializeNotifications will handle its own platform checks.
      this.reminderService.initializeNotifications();
    });
  }
}
