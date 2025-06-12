import { Component, OnInit } from '@angular/core'; // OnInit might not be needed if using ionViewWillEnter primarily
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, NavController, AlertController, IonRouterOutlet } from '@ionic/angular'; // IonRouterOutlet might not be used directly here but good for context

import { TaskList } from '../../../models/task-list.model';
import { Task } from '../../../models/task.model';
import { TaskListService } from '../../../services/task-list.service';
import { TaskService } from '../../../services/task.service';
// import { DailyStatusService } from '../../services/daily-status.service'; // Keep if still used, remove if not

@Component({
  selector: 'app-task-list',
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule] // Add RouterModule if navigating programmatically often and not relying on HTML routerLink
})
export class TaskListPage implements OnInit { // Consider IonViewWillEnter for page lifecycle

  taskLists: TaskList[] = [];
  tasks: Task[] = [];
  selectedListId: string | null = null;

  // Old properties - to be removed or re-evaluated
  // reminders: Task[] = []; // Replaced by tasks
  // public completedTodayKeys: string[] = []; // DailyStatusService related, keep if needed

  constructor(
    public taskListService: TaskListService,
    public taskService: TaskService,
    private router: Router,
    private alertController: AlertController,
    private navCtrl: NavController, // Keep if still used for navigation
    // private dailyStatusService: DailyStatusService // Keep if used
  ) { }

  ngOnInit() {
    // Initial data load can happen here or in ionViewWillEnter
    // For Ionic, ionViewWillEnter is often preferred for page data refresh
  }

  async ionViewWillEnter() {
    await this.loadTaskListsAndTasks();
    // this.completedTodayKeys = this.dailyStatusService.getCompletedTodayKeys(); // If keeping DailyStatusService
    // console.log('Updated completedTodayKeys:', this.completedTodayKeys);
  }

  async loadTaskListsAndTasks(): Promise<void> {
    this.taskLists = await this.taskListService.getTaskLists();
    if (!this.selectedListId && this.taskLists.length > 0) {
      this.selectedListId = this.taskLists[0].id;
    }
    await this.loadTasksForSelectedList();
  }

  async loadTasksForSelectedList(): Promise<void> {
    if (this.selectedListId) {
      // Pass undefined for parentId to get top-level tasks for the selected list
      this.tasks = await this.taskService.getTasks(this.selectedListId, undefined);
    } else {
      this.tasks = [];
    }
  }

  selectList(listId: string | null): void { // Allow null for deselection or initial state
    if(listId === null) {
        this.selectedListId = null;
        this.tasks = [];
        return;
    }
    this.selectedListId = listId;
    this.loadTasksForSelectedList();
  }

  async addTaskList(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'New List',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'List Name'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Create',
          handler: async (data) => {
            if (data.name && data.name.trim() !== '') {
              const newList = await this.taskListService.addTaskList(data.name.trim());
              // Optionally, select the new list
              // this.selectedListId = newList.id;
              await this.loadTaskListsAndTasks(); // Refresh lists and tasks
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async renameTaskList(list: TaskList): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Rename List',
      inputs: [
        {
          name: 'name',
          type: 'text',
          value: list.name,
          placeholder: 'List Name'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Save',
          handler: async (data) => {
            if (data.name && data.name.trim() !== '' && data.name.trim() !== list.name) {
              await this.taskListService.updateTaskList({ ...list, name: data.name.trim() });
              this.taskLists = await this.taskListService.getTaskLists(); // Refresh just the lists array
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async deleteTaskList(list: TaskList): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Delete List',
      message: `Are you sure you want to delete "${list.name}" and all its tasks? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          cssClass: 'danger',
          handler: async () => {
            await this.taskListService.deleteTaskList(list.id);
            await this.taskService.handleListDeleted(list.id); // This will delete associated tasks
            if (this.selectedListId === list.id) {
              this.selectedListId = null; // Deselect if current list is deleted
            }
            await this.loadTaskListsAndTasks(); // Refresh everything
          }
        }
      ]
    });
    await alert.present();
  }

  // Navigation methods - to be updated or used by HTML
  goToAddTaskPage(): void {
    if (!this.selectedListId) {
        console.warn('No list selected to add task to. Navigating without listId.');
        // Consider prompting to select/create a list or navigating to a general task add page if that makes sense.
        // For now, we will navigate to task-add, which should ideally handle no listId (e.g. prompt user).
        this.router.navigate(['/task-add']);
        return;
    }
    this.router.navigate(['/task-add'], { queryParams: { listId: this.selectedListId } }); // Updated path
  }

  goToEditTaskPage(task: Task): void {
    this.router.navigate(['/task-add', task.id]); // Updated path
  }

  // Method for deleting a single task (called from the template)
  async deleteTask(taskId: string): Promise<void> {
    // Optional: Add a confirmation dialog here as well
    const alert = await this.alertController.create({
        header: 'Confirm Delete',
        message: 'Are you sure you want to delete this task?',
        buttons: [
            { text: 'Cancel', role: 'cancel' },
            {
                text: 'Delete',
                cssClass: 'danger',
                handler: async () => {
                    await this.taskService.deleteTask(taskId);
                    await this.loadTasksForSelectedList(); // Refresh tasks in the current list
                }
            }
        ]
    });
    await alert.present();
  }


  // --- Old methods from ReminderListPage ---
  // These need to be reviewed:
  // - getFrequencyText: May still be relevant for displaying task details.
  // - isCompletedToday, toggleCompletionToday: If DailyStatusService functionality is kept.
  // - confirmDeleteReminder: Replaced by deleteTask.

  /*
  getFrequencyText(task: Task): string {
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    if (task.frequency === 'daily') {
      if (task.daysOfWeek && task.daysOfWeek.length > 0) {
        const selectedDayNames = task.daysOfWeek.map(d => dayNames[d]).join(', ');
        return `Diario (Días: ${selectedDayNames})`;
      }
      return 'Diario';
    } else if (task.frequency === 'weekly') {
      const isMonToFri = task.daysOfWeek &&
                         task.daysOfWeek.length === 5 &&
                         task.daysOfWeek.every((day, index) => day === index + 1);
      if (isMonToFri) {
        return 'Semanal (Lunes a Viernes)';
      } else if (task.daysOfWeek && task.daysOfWeek.length > 0) {
        const selectedDayNames = task.daysOfWeek.map(d => dayNames[d]).join(', ');
        return `Semanal (Días: ${selectedDayNames})`;
      }
      return 'Semanal (Lunes a Viernes)';
    }
    return 'Frecuencia no establecida';
  }

  isCompletedToday(taskId: string): boolean {
    return this.completedTodayKeys.includes(taskId);
  }

  async toggleCompletionToday(task: Task) {
    if (this.isCompletedToday(task.id)) {
      console.log(`Task ${task.id} is already marked as completed today.`);
      return;
    }
    // this.dailyStatusService.markAsCompletedToday(task.id);
    // this.completedTodayKeys = this.dailyStatusService.getCompletedTodayKeys();
    console.log(`Marked ${task.id} as completed. New keys:`, this.completedTodayKeys);
  }
  */
}
