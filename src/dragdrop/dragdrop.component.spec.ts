import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DragdropComponent } from './dragdrop.component';

describe('DragdropComponent', () => {
  let component: DragdropComponent;
  let fixture: ComponentFixture<DragdropComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DragdropComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DragdropComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
