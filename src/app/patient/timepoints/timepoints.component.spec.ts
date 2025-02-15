import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimepointsComponent } from './timepoints.component';

describe('TimepointsComponent', () => {
  let component: TimepointsComponent;
  let fixture: ComponentFixture<TimepointsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimepointsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimepointsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
