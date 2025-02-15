import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelationMatrixComponent } from './relation-matrix.component';

describe('RelationMatrixComponent', () => {
  let component: RelationMatrixComponent;
  let fixture: ComponentFixture<RelationMatrixComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RelationMatrixComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RelationMatrixComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
