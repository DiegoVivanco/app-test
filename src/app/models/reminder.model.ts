export interface Reminder {
  id: string; // Unique identifier
  text: string; // Reminder message
  frequency: 'daily' | 'weekly'; // How often it repeats
  daysOfWeek?: number[]; // 0 for Sunday, 1 for Monday, etc. For 'weekly' or daily with specific active days
  enabled: boolean; // Is the reminder active?
  time: string; // Time of day for the reminder, e.g., "09:00"
}
