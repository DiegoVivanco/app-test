export interface Reminder {
  id: string;
  text: string;
  time: string; // Represent time as string e.g., "14:30"
  enabled: boolean;
  // Add any other properties that might be discovered later
}
