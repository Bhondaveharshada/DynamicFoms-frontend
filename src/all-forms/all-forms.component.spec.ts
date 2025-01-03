import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllFormsComponent } from './all-forms.component';

describe('AllFormsComponent', () => {
  let component: AllFormsComponent;
  let fixture: ComponentFixture<AllFormsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllFormsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllFormsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
