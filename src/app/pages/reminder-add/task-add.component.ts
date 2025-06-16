import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NavController, ToastController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Task } from '../../../models/task.model';
import { TaskList } from '../../../models/task-list.model';
import { TaskService } from '../../../services/task.service';
import { TaskListService } from '../../../services/task-list.service';

@Component({
  selector: 'app-task-add',
  templateUrl: './task-add.component.html',
  styleUrls: ['./task-add.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
})
export class TaskAddPage implements OnInit {
  reminderForm!: FormGroup;
  daysOfWeekOptions = [
    { name: 'Lunes', value: 1, isChecked: false }, { name: 'Martes', value: 2, isChecked: false },
    { name: 'Miércoles', value: 3, isChecked: false }, { name: 'Jueves', value: 4, isChecked: false },
    { name: 'Viernes', value: 5, isChecked: false }, { name: 'Sábado', value: 6, isChecked: false },
    { name: 'Domingo', value: 0, isChecked: false }
  ];
  isEditMode = false;
  taskId: string | null = null;
  taskLists: TaskList[] = [];
  selectedListId: string | null = null;
  currentTaskForEdit: Task | null = null;

  constructor(
    public taskService: TaskService,
    public taskListService: TaskListService,
    private route: ActivatedRoute,
    private router: Router,
    private navController: NavController,
    private toastController: ToastController,
    private fb: FormBuilder
  ) {
    this.reminderForm = this.fb.group({
      text: ['', Validators.required],
      time: ['09:00', Validators.required],
      insistenceInterval: [30, Validators.min(1)],
      frequency: ['daily', Validators.required]
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadTaskLists();

    this.taskId = this.route.snapshot.paramMap.get('id');
    const queryListId = this.route.snapshot.queryParamMap.get('listId');

    if (this.taskId) {
      this.isEditMode = true;
      await this.loadTaskDetails(this.taskId);
    } else {
      this.isEditMode = false;
      this.reminderForm.reset({ text: '', time: '09:00', insistenceInterval: 30, frequency: 'daily' });
      if (queryListId) {
        this.selectedListId = queryListId;
      } else if (this.taskLists.length > 0) {
        this.selectedListId = this.taskLists[0].id;
      }
    }
  }

  async loadTaskLists(): Promise<void> {
    try {
      this.taskLists = await this.taskListService.getTaskLists();
      if (!this.isEditMode && !this.selectedListId && this.taskLists.length > 0) {
        this.selectedListId = this.taskLists[0].id;
      }
    } catch (error) {
      console.error('Error loading task lists:', error);
      const toast = await this.toastController.create({
        message: 'Error al cargar las listas de tareas.',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }

  async loadTaskDetails(id: string): Promise<void> {
    try {
      const loadedTask = await this.taskService.getTaskById(id);
      if (loadedTask) {
        this.currentTaskForEdit = loadedTask;
        this.reminderForm.patchValue({
          text: loadedTask.text,
          time: loadedTask.time,
          insistenceInterval: loadedTask.insistenceInterval,
          frequency: loadedTask.frequency
        });
        this.updateDaysOfWeekCheckboxes(loadedTask.daysOfWeek);
        this.selectedListId = loadedTask.listId || null;
      } else {
        const toast = await this.toastController.create({
          message: 'Tarea no encontrada.',
          duration: 2000,
          color: 'danger'
        });
        await toast.present();
        this.navController.back();
      }
    } catch (error) {
      console.error(`Error loading task details for ID ${id}:`, error);
      const toast = await this.toastController.create({
        message: 'Error al cargar los detalles de la tarea.',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
      this.navController.back();
    }
  }

  updateDaysOfWeekCheckboxes(apiDays: number[] | undefined): void {
    if (!apiDays) {
      this.daysOfWeekOptions.forEach(opt => opt.isChecked = false);
      return;
    }
    this.daysOfWeekOptions.forEach(dayOpt => {
      dayOpt.isChecked = apiDays.includes(dayOpt.value);
    });
  }

  onListChange(event: any): void {
    this.selectedListId = event.detail.value;
  }

  async saveReminder(): Promise<void> {
    if (this.reminderForm.invalid) {
      this.reminderForm.markAllAsTouched();
      console.log('Form is invalid');
      const toast = await this.toastController.create({
        message: 'Por favor, complete todos los campos requeridos.',
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    const formValues = this.reminderForm.value;
    const selectedDays = this.daysOfWeekOptions.filter(opt => opt.isChecked).map(opt => opt.value);

    console.log('Form Values:', formValues);
    console.log('Selected Days:', selectedDays);
    console.log('Selected List ID:', this.selectedListId);

    // In a real scenario, you would construct the Task object and call the service
    // For example:
    // const taskToSave: Partial<Task> = {
    //   ...this.currentTaskForEdit, // if isEditMode
    //   text: formValues.text,
    //   time: formValues.time,
    //   insistenceInterval: formValues.insistenceInterval,
    //   frequency: formValues.frequency,
    //   daysOfWeek: selectedDays,
    //   listId: this.selectedListId,
    //   enabled: this.currentTaskForEdit ? this.currentTaskForEdit.enabled : true // Default for new tasks
    // };

    // if (this.isEditMode && this.taskId) {
    //   await this.taskService.updateTask({ ...taskToSave, id: this.taskId });
    // } else {
    //   await this.taskService.addTask(taskToSave);
    // }

    const toast = await this.toastController.create({
      message: 'Recordatorio guardado (simulación): ' + JSON.stringify(formValues),
      duration: 2000,
      color: 'success'
    });
    await toast.present();
    this.navController.back();
  }
}
