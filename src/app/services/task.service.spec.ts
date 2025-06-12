import { TestBed } from '@angular/core/testing';

import { TaskService } from './task.service'; // Path and Service updated

describe('TaskService', () => {
  let service: TaskService; // Type updated

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaskService); // Injection updated
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
