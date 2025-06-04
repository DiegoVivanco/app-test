import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ReminderAddComponent } from './reminder-add.component';

describe('ReminderAddComponent', () => {
  let component: ReminderAddComponent;
  let fixture: ComponentFixture<ReminderAddComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ReminderAddComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ReminderAddComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
