import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'reminder-list', // Default route
    pathMatch: 'full'
  },
  {
    path: 'reminder-list',
    loadComponent: () => import('./pages/reminder-list/reminder-list.component').then(m => m.ReminderListPage)
  },
  {
    path: 'reminder-add',
    loadComponent: () => import('./pages/reminder-add/reminder-add.component').then(m => m.ReminderAddPage)
  },
  {
    path: 'reminder-edit/:id',
    loadComponent: () => import('./pages/reminder-add/reminder-add.component').then(m => m.ReminderAddPage) // Uses the same page component
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
