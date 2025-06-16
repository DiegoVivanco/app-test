import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Reminder } from '../models/reminder.model'; // Import the Reminder model

@Injectable({
  providedIn: 'root',
})
export class ReminderService {
  // Subject for requestConfirmCompletion$
  private requestConfirmCompletionSource = new Subject<{ reminderId: string; reminderText: string }>();
  requestConfirmCompletion$: Observable<{ reminderId: string; reminderText: string }> = this.requestConfirmCompletionSource.asObservable();

  constructor() {}

  initializeNotifications(): Promise<void> {
    console.log('ReminderService: initializeNotifications called');
    // In a real implementation, this would likely involve checking permissions,
    // and potentially scheduling initial notifications based on stored reminders.
    return Promise.resolve();
  }

  getReminderById(id: string): Reminder | undefined {
    console.log(`ReminderService: getReminderById called for ID: ${id}`);
    // This is a stub. Replace with actual logic to fetch a reminder.
    // Example: return this.reminders.find(r => r.id === id);
    return undefined;
  }

  confirmReminderCompleted(reminderId: string): void {
    console.log(`ReminderService: confirmReminderCompleted called for ID: ${reminderId}`);
    // Stubbed method. Implement actual logic.
  }

  reminderCompletionCancelled(reminderId: string): void {
    console.log(`ReminderService: reminderCompletionCancelled called for ID: ${reminderId}`);
    // Stubbed method. Implement actual logic.
  }

  cancelHourlyNotificationsForToday(reminderId: string): Promise<void> {
    console.log(`ReminderService: cancelHourlyNotificationsForToday called for ID: ${reminderId}`);
    // Stubbed method. Implement actual logic.
    return Promise.resolve();
  }

  getNumericId(id: string): number {
    console.log(`ReminderService: getNumericId called for ID: ${id}`);
    // This is a stub. In a real scenario, you'd convert a string ID to a unique numeric ID
    // suitable for local notifications, which often require integer IDs.
    // This simple hash function is just for placeholder purposes.
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash); // Ensure positive ID
  }

  // Helper to emit values to requestConfirmCompletion$ from other parts of the service if needed
  // Or typically, this might be triggered by some internal logic of the service.
  // For now, app.component.ts subscribes to it, but nothing emits to it yet.
  // This method is not directly called by app.component.ts but is related to requestConfirmCompletion$.
  triggerConfirmCompletion(reminderId: string, reminderText: string): void {
    this.requestConfirmCompletionSource.next({ reminderId, reminderText });
  }
}
