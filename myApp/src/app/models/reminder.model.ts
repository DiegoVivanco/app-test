export interface Reminder {
  id: string; // Unique identifier
  text: string; // Reminder message
  frequency: 'daily' | 'weekly'; // How often it repeats
  daysOfWeek?: number[]; // 0 for Sunday, 1 for Monday, etc. For 'weekly' or daily with specific active days
  optionalDays?: number[]; // Days when the reminder is optional, e.g., [0, 6] for Sunday, Saturday
  enabled: boolean; // Is the reminder active?
  time: string; // Time of day for the reminder, e.g., "09:00"
}
