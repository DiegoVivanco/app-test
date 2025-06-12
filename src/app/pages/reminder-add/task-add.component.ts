import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NavController, ToastController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Needed for [(ngModel)]

import { Task } from '../../../models/task.model';
import { TaskList } from '../../../models/task-list.model';
import { TaskService } from '../../../services/task.service';
import { TaskListService } from '../../../services/task-list.service';

@Component({
  selector: 'app-task-add',
  templateUrl: './task-add.component.html',
  styleUrls: ['./task-add.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class TaskAddPage implements OnInit {
  task: Partial<Task> = { text: '', enabled: true, frequency: 'daily' }; // Initialize with defaults
  taskLists: TaskList[] = [];
  isEditMode = false;
  taskId: string | null = null;
  selectedListId: string | null = null; // To hold the listId for the task

  // Properties from old reminder form - to be removed or adapted
  // reminderForm: FormGroup;
  // daysOfWeekOptions = [ ... ]; // This logic will be simplified or handled differently if needed for Task

  constructor(
    public taskService: TaskService,
    public taskListService: TaskListService,
    private route: ActivatedRoute,
    private router: Router,
    private navController: NavController,
    private toastController: ToastController
    // private fb: FormBuilder, // Removed FormBuilder for now
  ) {
    // Initialize form if it were still used
    // this.reminderForm = this.fb.group({...});
  }

  async ngOnInit() {
    await this.loadTaskLists(); // Load lists first

    this.taskId = this.route.snapshot.paramMap.get('id');
    const queryListId = this.route.snapshot.queryParamMap.get('listId');

    if (this.taskId) {
      this.isEditMode = true;
      await this.loadTaskDetails(this.taskId);
    } else {
      this.isEditMode = false;
      this.task = {
        text: '',
        enabled: true,
        frequency: 'daily', // Default frequency
        // time: '09:00' // Default time if needed
      };
      if (queryListId) {
        this.selectedListId = queryListId;
        this.task.listId = queryListId;
      } else if (this.taskLists.length > 0) {
        // If no listId from query param, default to the first list
        this.selectedListId = this.taskLists[0].id;
        this.task.listId = this.taskLists[0].id;
      }
    }
  }

  async loadTaskLists(): Promise<void> {
    this.taskLists = await this.taskListService.getTaskLists();
    // If new task and no listId set from query, and no listId on task obj, default from loaded lists
    if (!this.isEditMode && !this.task.listId && this.taskLists.length > 0) {
        this.selectedListId = this.taskLists[0].id;
        this.task.listId = this.taskLists[0].id;
    }
  }

  async loadTaskDetails(id: string): Promise<void> {
    const loadedTask = await this.taskService.getTaskById(id);
    if (loadedTask) {
      this.task = { ...loadedTask };
      this.selectedListId = loadedTask.listId || null;
      // Format dueDate for ion-datetime if it's stored as ISO string
      if (loadedTask.dueDate) {
        this.task.dueDate = loadedTask.dueDate.split('T')[0]; // Ensure YYYY-MM-DD
      }
    } else {
      const toast = await this.toastController.create({ message: 'Task not found.', duration: 2000, color: 'danger' });
      await toast.present();
      this.navController.back();
    }
  }

  onListChange(event: any): void {
    this.selectedListId = event.detail.value;
    this.task.listId = this.selectedListId;
  }

  // Example for handling daysOfWeek if you add a multi-select UI for it
  // updateDaysOfWeek(selectedDays: number[]) {
  //   this.task.daysOfWeek = selectedDays;
  // }

  async saveTask(): Promise<void> {
    if (!this.task.text || this.task.text.trim() === '') {
      const toast = await this.toastController.create({ message: 'Task text is required.', duration: 2000, color: 'danger' });
      await toast.present();
      return;
    }
    if (!this.selectedListId) {
       const toast = await this.toastController.create({ message: 'Please select a list.', duration: 2000, color: 'danger' });
       await toast.present();
       return;
    }
    this.task.listId = this.selectedListId;


    // Ensure 'enabled' is a boolean; default to true if undefined for some reason on new tasks
    this.task.enabled = this.task.enabled !== undefined ? this.task.enabled : true;
    // Ensure numeric fields are numbers if they come from form inputs that might be strings
    if (this.task.insistenceInterval) this.task.insistenceInterval = +this.task.insistenceInterval;
    if (this.task.order) this.task.order = +this.task.order;


    try {
      if (this.isEditMode && this.taskId) {
        // Ensure all fields expected by updateTask are present
        await this.taskService.updateTask(this.task as Task);
      } else {
        // For new tasks, id is generated by the service.
        // 'enabled' is also set by service, but we ensure it here for consistency before sending.
        const { id, ...newTaskData } = this.task; // Exclude 'id' if present on partial task object

        // The addTask method expects Omit<Task, 'id' | 'enabled'>
        // Our current this.task is Partial<Task> and might have 'id' (as null/undefined) or 'enabled'
        // So, we create an object that strictly matches the Omit type.
        const dataForAdd: Omit<Task, 'id' | 'enabled'> = {
            text: newTaskData.text!, // text is validated non-empty
            frequency: newTaskData.frequency || 'daily', // Default if not set
            time: newTaskData.time,
            daysOfWeek: newTaskData.daysOfWeek,
            insistenceInterval: newTaskData.insistenceInterval,
            dueDate: newTaskData.dueDate,
            description: newTaskData.description,
            listId: newTaskData.listId!, // listId is validated non-empty
            parentId: newTaskData.parentId,
            order: newTaskData.order
        };
        await this.taskService.addTask(dataForAdd);
      }
      const toast = await this.toastController.create({ message: 'Task saved!', duration: 2000, color: 'success' });
      await toast.present();
      this.navController.back();
    } catch (error) {
      console.error("Error saving task:", error);
      const toast = await this.toastController.create({ message: 'Error saving task. See console.', duration: 3000, color: 'danger' });
      await toast.present();
    }
  }
}
