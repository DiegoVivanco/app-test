import { Injectable } from '@angular/core';
import { Task } from '../models/task.model'; // Path and type updated
import { v4 as uuidv4 } from 'uuid';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Platform } from '@ionic/angular';
import { Subject } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { TaskListService } from './task-list.service'; // Import TaskListService

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly TASKS_STORAGE_KEY = 'tasks'; // Renamed storage key
  private tasks: Task[] = []; // Renamed from reminders
  private requestConfirmCompletionSource = new Subject<{ taskId: string, taskText: string }>(); // Renamed reminderId to taskId
  public requestConfirmCompletion$ = this.requestConfirmCompletionSource.asObservable();

  constructor(
    private platform: Platform,
    private taskListService: TaskListService // Injected TaskListService
  ) {
    // Initialization logic, potentially including loading tasks, will be here or in an init method.
    // For now, let's assume initializeNotifications handles loading or is called after tasks are loaded.
  }

  private async _loadTasksFromStorage(): Promise<void> { // Renamed
    try {
      const storedTasks = await Preferences.get({ key: this.TASKS_STORAGE_KEY }); // Use new key
      if (storedTasks && storedTasks.value) {
        this.tasks = JSON.parse(storedTasks.value) as Task[];
        console.log('Tasks loaded from storage:', this.tasks);
      } else {
        this.tasks = [];
        console.log('No tasks found in storage, initializing empty list.');
      }
    } catch (error) {
      console.error('Error loading tasks from storage:', error);
      this.tasks = [];
    }
  }

  private async _saveTasksToStorage(): Promise<void> { // Renamed
    try {
      await Preferences.set({
        key: this.TASKS_STORAGE_KEY, // Use new key
        value: JSON.stringify(this.tasks)
      });
      console.log('Tasks saved to storage.');
    } catch (error) {
      console.error('Error saving tasks to storage:', error);
    }
  }

  async initializeNotifications() {
    await this.platform.ready();

    await this._loadTasksFromStorage(); // Call renamed method

    if (this.tasks.length === 0) {
      console.log('No tasks loaded, adding example task.');
      const now = new Date();
      const exampleTask: Task = {
        id: uuidv4(),
        text: 'Revisar correos (Ejemplo)',
        frequency: 'daily',
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes() + 1).padStart(2, '0')}`, // Example time
        enabled: true,
        insistenceInterval: 10,
        description: 'Este es un task de ejemplo para desarrollo.',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
        listId: 'default', // Assuming a default list or handle if listId is crucial
        // parentId: undefined, // Optional
        // order: 0 // Optional
      };
      this.tasks.push(exampleTask);
      await this._saveTasksToStorage(); // Call renamed method
    }

    const permResult = await LocalNotifications.requestPermissions();
    if (permResult.display === 'granted') {
      const taskActionTypes = { // Renamed from reminderActionTypes
        types: [
          {
            id: 'TASK_ACTIONS', // Renamed ID
            actions: [
              { id: 'snooze', title: 'Posponer' },
              { id: 'mark_done', title: 'Completada' }
            ]
          }
        ]
      };
      try {
        await LocalNotifications.registerActionTypes(taskActionTypes); // Use renamed actions
        console.log('Task action types registered');
      } catch (error) {
        console.error('Error registering task action types', error);
      }

      await this.scheduleAllTaskNotifications(); // Call renamed method

      LocalNotifications.addListener('localNotificationActionPerformed', async (notificationAction) => {
        console.log('Notification action performed:', notificationAction);
        const actionId = notificationAction.actionId;
        // Ensure 'taskId' is consistently used in notification extras
        const { taskId, insistenceInterval } = notificationAction.notification.extra;

        if (actionId === 'mark_done') {
          console.log(`Task ${taskId} requesting confirmation to mark as completed.`);
          if (taskId) {
            const task = await this.getTaskById(taskId); // Use await if getTaskById becomes async
            if (task) {
              this.requestConfirmCompletionSource.next({ taskId, taskText: task.text });
            } else {
              console.warn(`Task with ID ${taskId} not found when attempting to confirm completion.`);
            }
          } else {
            console.warn(`No taskId provided for mark_done action.`);
          }
        } else if (actionId === 'snooze' || actionId === 'tap') {
          if (taskId && typeof insistenceInterval === 'number' && insistenceInterval > 0) {
            const task = await this.getTaskById(taskId); // Use await if getTaskById becomes async
            if (task && task.enabled) {
              const newTime = new Date().getTime() + insistenceInterval * 60 * 1000;
              const newNotificationId = this.getNumericId(`${task.id}-insist-${Date.now()}`);
              const newNotificationConfig: any = {
                id: newNotificationId,
                title: task.text,
                body: `Insistencia: ${task.text}`,
                schedule: { at: new Date(newTime) },
                extra: { ...notificationAction.notification.extra, taskId: task.id }, // Ensure taskId is passed
                actionTypeId: 'TASK_ACTIONS', // Use new actionTypeId
                sound: this.platform.is('ios') ? 'beep.wav' : undefined
              };
              try {
                await LocalNotifications.schedule({ notifications: [newNotificationConfig] });
                console.log(`Scheduled insisted notification for task ${taskId} (action: ${actionId}) at ${new Date(newTime)}`);
              } catch (e) {
                console.error('Error scheduling insisted notification', e);
              }
            } else {
              console.log(`Task ${taskId} not found or not enabled for insistence (action: ${actionId}).`);
            }
          } else {
            console.log(`No valid taskId or insistenceInterval for actioned notification (action: ${actionId}).`);
          }
        } else {
          console.log(`Unknown or unhandled action: ${actionId}`);
        }
      });
    } else {
      console.warn('No permission for local notifications');
    }
  }

  public getNumericId(idPart: string): number {
    let hash = 0;
    for (let i = 0; i < idPart.length; i++) {
      const char = idPart.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash % 2147483647); // Ensure positive and within typical ID limits
  }

  async scheduleTaskNotification(task: Task) { // Renamed
    if (task.dueDate) {
      console.warn(`Task ${task.id} has a dueDate, but notification scheduling based on dueDate is not yet fully implemented beyond basic logging.`);
      // Actual dueDate based scheduling logic would go here.
      // For now, we might still schedule based on time/frequency if present, or skip.
      // This example will let frequency-based scheduling proceed if time is also set.
    }

    if (!task.enabled || !task.time?.includes(':')) return;

    const [hour, minute] = task.time.split(':').map(Number);
    const notifications = [];
    const commonExtra = { taskId: task.id, insistenceInterval: task.insistenceInterval ?? 30 };

    if (task.frequency === 'daily') {
      notifications.push({
        id: this.getNumericId(task.id), // Use a consistent ID for the main daily notification
        title: task.text, // More direct title
        body: task.description || `Recordatorio: ${task.text}`, // Use description if available
        schedule: { on: { hour, minute }, repeats: true }, // Consider if repeats:true is always desired with dueDate
        extra: commonExtra,
        actionTypeId: 'TASK_ACTIONS'
      });
    }

    if (task.frequency === 'weekly' && task.daysOfWeek?.length) {
      for (const day of task.daysOfWeek) {
        notifications.push({
          id: this.getNumericId(`${task.id}-${day}`), // Unique ID for each day's weekly notification
          title: task.text,
          body: task.description || `Recordatorio: ${task.text}`,
          schedule: { on: { weekday: day + 1, hour, minute }, repeats: true },
          extra: { ...commonExtra, weekday: day + 1 },
          actionTypeId: 'TASK_ACTIONS'
        });
      }
    }

    // Basic example for dueDate based notification (if time is also set)
    // This is simplistic and might need more robust logic for combining date and time.
    if (task.dueDate && task.time) {
        const [dueYear, dueMonth, dueDay] = task.dueDate.split('-').map(Number);
        const scheduleDate = new Date(dueYear, dueMonth - 1, dueDay, hour, minute);
        if (scheduleDate.getTime() > Date.now()) { // Only schedule if in the future
            notifications.push({
                id: this.getNumericId(`${task.id}-due`),
                title: `Vence: ${task.text}`,
                body: task.description || `Tarea programada para hoy.`,
                schedule: { at: scheduleDate, allowWhileIdle: true },
                extra: commonExtra,
                actionTypeId: 'TASK_ACTIONS'
            });
        }
    }


    if (notifications.length) {
      try {
        await LocalNotifications.schedule({ notifications });
      } catch (e) {
        console.error("Error scheduling task notification(s): ", e, notifications);
      }
    }
  }

  async scheduleAllTaskNotifications() { // Renamed
    for (const task of this.tasks) {
      task.enabled ? await this.scheduleTaskNotification(task) : await this.cancelTaskNotification(task);
    }
  }

  async cancelTaskNotification(task: Task) { // Renamed
    const idsToCancel = [];
    // Standard frequency-based notifications
    if (task.frequency === 'daily') {
      idsToCancel.push(this.getNumericId(task.id));
    }
    if (task.frequency === 'weekly' && task.daysOfWeek?.length) {
      task.daysOfWeek.forEach(day => idsToCancel.push(this.getNumericId(`${task.id}-${day}`)));
    }
    // DueDate based notification
    idsToCancel.push(this.getNumericId(`${task.id}-due`));

    // Cancel any insistence notifications (these are dynamically ID'd, so harder to mass cancel without tracking)
    // For simplicity, we are not cancelling insistence notifications here but this could be a future improvement.
    // One way would be to cancel all notifications and reschedule only the active, non-insistence ones.

    if (idsToCancel.length) {
      try {
        await LocalNotifications.cancel({ notifications: idsToCancel.map(id => ({ id })) });
        console.log('Cancelled notifications for task:', task.id, idsToCancel);
      } catch (e) {
        console.error("Error cancelling task notification(s): ", e);
      }
    }
  }

  async addTask(data: Omit<Task, 'id' | 'enabled'>): Promise<Task> { // Renamed
    const newTask: Task = {
      id: uuidv4(),
      enabled: true, // Default new tasks to enabled
      ...data, // Spread provided data
      // Ensure defaults for optional fields if not provided in data
      description: data.description ?? '',
      listId: data.listId ?? 'default', // Or handle if listId is mandatory
      insistenceInterval: data.insistenceInterval ?? 30, // Default insistence
      order: data.order ?? 0, // Default order
      // parentId can be undefined if not provided
    };
    this.tasks.push(newTask);
    if (newTask.enabled) {
      await this.scheduleTaskNotification(newTask);
    }
    await this._saveTasksToStorage();
    return newTask;
  }

  async updateTask(updatedTask: Task): Promise<Task> { // Renamed
    const index = this.tasks.findIndex(task => task.id === updatedTask.id);
    if (index === -1) throw new Error('Task not found');

    const oldTask = { ...this.tasks[index] };
    this.tasks[index] = { ...updatedTask }; // Replace with new version

    await this.cancelTaskNotification(oldTask); // Cancel old notifications
    if (this.tasks[index].enabled) {
      await this.scheduleTaskNotification(this.tasks[index]); // Schedule new ones if enabled
    }
    await this._saveTasksToStorage();
    return this.tasks[index];
  }

  async deleteTask(id: string): Promise<void> { // Renamed
    const index = this.tasks.findIndex(task => task.id === id);
    if (index !== -1) {
      const taskToDelete = this.tasks[index];
      await this.cancelTaskNotification(taskToDelete);

      // Recursively delete subtasks
      const subtasks = this.tasks.filter(task => task.parentId === id);
      for (const subtask of subtasks) {
        await this.deleteTask(subtask.id); // Recursive call
      }
      // Remove the task itself after its subtasks
      this.tasks.splice(index, 1);
      await this._saveTasksToStorage();
    }
  }

  async getTasks(listId?: string, parentId?: string): Promise<Task[]> { // Renamed, added parentId filter
    let filteredTasks = [...this.tasks];
    if (listId) {
      filteredTasks = filteredTasks.filter(task => task.listId === listId);
    }
    if (parentId) {
      filteredTasks = filteredTasks.filter(task => task.parentId === parentId);
    } else {
      // If parentId is not specified, typically we return top-level tasks.
      // This depends on desired behavior: either filter for tasks without parentId, or show all if not filtering by parent.
      // For now, if parentId is undefined, no further parent-based filtering.
      // If you want to ONLY get top-level tasks when parentId is not given:
      // filteredTasks = filteredTasks.filter(task => !task.parentId);
    }
    return filteredTasks.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)); // Sort by order
  }

  async getTaskById(id: string): Promise<Task | undefined> { // Renamed & async to match getTasks pattern
    return this.tasks.find(task => task.id === id);
  }

  isTaskDue(task: Task, date: Date): boolean { // Renamed
    if (!task.enabled) return false;

    const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (task.dueDate) {
      const taskDueDate = new Date(task.dueDate);
      const normalizedTaskDueDate = new Date(taskDueDate.getFullYear(), taskDueDate.getMonth(), taskDueDate.getDate());
      if (normalizedTaskDueDate.getTime() === today.getTime()) {
        // If it has a specific due date and it's today, it's due.
        // Time part would be handled by notifications.
        return true;
      }
      // If dueDate is set and not today, frequency logic might not apply or might be secondary.
      // For now, if dueDate is set and it's not today, we consider it not "due" for daily check.
      return false;
    }

    // If no dueDate, fall back to frequency-based logic
    const todayDayOfWeek = date.getDay(); // Sunday - 0, ...
    if (task.frequency === 'daily') {
      return !task.daysOfWeek?.length || task.daysOfWeek.includes(todayDayOfWeek);
    } else if (task.frequency === 'weekly') {
      return task.daysOfWeek?.includes(todayDayOfWeek) || false;
    }
    return false;
  }

  // cancelHourlyNotificationsForToday is deprecated/removed as insistence covers part of it
  // and specific "hourly" logic is not in the new model directly.

  public confirmTaskCompleted(taskId: string): void { // Renamed
    console.log(`TaskService: Task ${taskId} confirmed as completed by user.`);
    // Potentially interact with DailyStatusService or similar here.
  }

  public taskCompletionCancelled(taskId: string): void { // Renamed
    console.log(`TaskService: Completion of task ${taskId} cancelled by user.`);
  }

  // Method to handle deletion of a list and its associated tasks
  async handleListDeleted(listId: string): Promise<void> {
    const tasksInList = this.tasks.filter(task => task.listId === listId);
    for (const task of tasksInList) {
      // deleteTask will handle subtasks and notifications
      await this.deleteTask(task.id);
    }
    // _saveTasksToStorage is called by deleteTask, so no need to call it again here explicitly.
    console.log(`All tasks associated with listId ${listId} have been deleted.`);
  }
}
