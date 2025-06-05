import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ReminderListComponent } from './reminder-list.component';

describe('ReminderListComponent', () => {
  let component: ReminderListComponent;
  let fixture: ComponentFixture<ReminderListComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ReminderListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReminderListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
