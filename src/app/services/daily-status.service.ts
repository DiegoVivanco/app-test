import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DailyStatusService {
  private readonly COMPLETED_PREFIX = 'completed_'; // Prefix for localStorage keys

  constructor() {
    this.clearOldCompletedStatuses(); // Clean up on service initialization
  }

  /**
   * Generates the localStorage key for a reminder's completion status on a specific date.
   * @param reminderId The ID of the reminder.
   * @param date The date for which to check completion. Defaults to today.
   * @returns The localStorage key string.
   */
  private getKey(reminderId: string, date: Date = new Date()): string {
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    return `${this.COMPLETED_PREFIX}${dateString}_${reminderId}`;
  }

  /**
   * Marks a reminder as completed for today.
   * @param reminderId The ID of the reminder.
   */
  markAsCompletedToday(reminderId: string): void {
    if (typeof localStorage !== 'undefined') {
      const key = this.getKey(reminderId);
      localStorage.setItem(key, 'true');
      console.log(`Marked reminder ${reminderId} as completed for today.`);
    } else {
      console.warn('localStorage is not available. Cannot mark reminder as completed.');
    }
  }

  /**
   * Checks if a reminder was marked as completed for today.
   * @param reminderId The ID of the reminder.
   * @returns True if completed today, false otherwise.
   */
  isCompletedToday(reminderId: string): boolean {
    if (typeof localStorage !== 'undefined') {
      const key = this.getKey(reminderId);
      return localStorage.getItem(key) === 'true';
    }
    console.warn('localStorage is not available. Cannot check reminder completion status.');
    return false; // Default to false if localStorage is not available
  }

  /**
   * Clears completion statuses that are older than today.
   * This helps prevent localStorage from growing indefinitely.
   */
  clearOldCompletedStatuses(): void {
    if (typeof localStorage !== 'undefined') {
      const todayDateString = new Date().toISOString().split('T')[0];
      let itemsRemovedCount = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.COMPLETED_PREFIX)) {
          const datePart = key.substring(this.COMPLETED_PREFIX.length).split('_')[0];
          if (datePart !== todayDateString) {
            localStorage.removeItem(key);
            itemsRemovedCount++;
          }
        }
      }
      if (itemsRemovedCount > 0) {
        console.log(`Cleared ${itemsRemovedCount} old reminder completion statuses.`);
      }
    } else {
      console.warn('localStorage is not available. Cannot clear old completion statuses.');
    }
  }

  /**
   * Retrieves all reminder IDs that were marked as completed for today.
   * @returns An array of reminder IDs.
   */
  getCompletedTodayKeys(): string[] {
    if (typeof localStorage !== 'undefined') {
      const completedIds: string[] = [];
      const todayKeyPart = `${this.COMPLETED_PREFIX}${new Date().toISOString().split('T')[0]}_`;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(todayKeyPart) && localStorage.getItem(key) === 'true') {
          completedIds.push(key.substring(todayKeyPart.length));
        }
      }
      return completedIds;
    }
    console.warn('localStorage is not available. Cannot get completed today keys.');
    return [];
  }
}
