import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimepointComponent } from './timepoint.component';

describe('TimepointComponent', () => {
  let component: TimepointComponent;
  let fixture: ComponentFixture<TimepointComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimepointComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimepointComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
