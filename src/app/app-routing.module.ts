import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'task-list', // Updated redirectTo
    pathMatch: 'full'
  },
  {
    path: 'task-list', // Updated path
    loadComponent: () => import('./pages/reminder-list/task-list.component').then(m => m.TaskListPage) // Updated import path and class name
  },
  {
    path: 'task-add', // Updated path
    loadComponent: () => import('./pages/reminder-add/task-add.component').then(m => m.TaskAddPage) // Updated import and class
  },
  {
    path: 'task-add/:id', // Updated path
    loadComponent: () => import('./pages/reminder-add/task-add.component').then(m => m.TaskAddPage) // Updated import and class
  },
  {
    path: 'home', // Or whatever your old default was, can be removed or kept
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
