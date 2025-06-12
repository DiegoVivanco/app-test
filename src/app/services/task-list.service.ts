import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { v4 as uuidv4 } from 'uuid';
import { TaskList } from '../models/task-list.model';

@Injectable({
  providedIn: 'root'
})
export class TaskListService {
  private readonly STORAGE_KEY = 'task-lists';
  private taskLists: TaskList[] = [];

  constructor() {
    this._loadTaskLists();
  }

  private async _loadTaskLists(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: this.STORAGE_KEY });
      if (value) {
        this.taskLists = JSON.parse(value);
      } else {
        this.taskLists = [];
      }
    } catch (error) {
      console.error('Error loading task lists from Preferences:', error);
      this.taskLists = []; // Initialize with empty array in case of error
    }
  }

  private async _saveTaskLists(): Promise<void> {
    try {
      await Preferences.set({
        key: this.STORAGE_KEY,
        value: JSON.stringify(this.taskLists)
      });
    } catch (error) {
      console.error('Error saving task lists to Preferences:', error);
    }
  }

  async getTaskLists(): Promise<TaskList[]> {
    return [...this.taskLists]; // Return a copy
  }

  async addTaskList(name: string): Promise<TaskList> {
    const newTaskList: TaskList = {
      id: uuidv4(),
      name
    };
    this.taskLists.push(newTaskList);
    await this._saveTaskLists();
    return newTaskList;
  }

  async updateTaskList(updatedList: TaskList): Promise<TaskList> {
    const index = this.taskLists.findIndex(list => list.id === updatedList.id);
    if (index === -1) {
      throw new Error(`TaskList with id ${updatedList.id} not found.`);
    }
    this.taskLists[index] = updatedList;
    await this._saveTaskLists();
    return updatedList;
  }

  async deleteTaskList(id: string): Promise<void> {
    this.taskLists = this.taskLists.filter(list => list.id !== id);
    await this._saveTaskLists();
  }

  async getTaskListById(id: string): Promise<TaskList | undefined> {
    return this.taskLists.find(list => list.id === id);
  }
}
