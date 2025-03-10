import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // Import ChangeDetectorRef
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormService } from '../services/form.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, moveItemInArray, CdkDragDrop } from '@angular/cdk/drag-drop';

interface Field { 
  inputType: string;
  label: string;
  required: boolean;
  options: string[];
}

interface FormRow { 
  fields: Field[];
}

@Component({
  selector: 'app-updateform',
  standalone: true, 
  imports: [CommonModule, RouterModule, FormsModule, DragDropModule],
  templateUrl: './updateform.component.html',
  styleUrl: './updateform.component.css'
})
export class UpdateformComponent implements OnInit {

  form_id: any;
  formUpdated = false;
  title: string = '';
  additionalFields: FormRow[] = []; 

  all = [
    'text',
    'number',
    'email',
    'password',
    'date',
    'checkbox',
    'radio',
    'textarea'
  ];

  newRowPlaceholder: any[] = [];

  constructor(
    private activatedRoute: ActivatedRoute,
    private formService: FormService,
    private cdr: ChangeDetectorRef 
  ) { }

  ngOnInit(): void {
    this.form_id = this.activatedRoute.snapshot.paramMap.get('id');
    console.log('Form ID:', this.form_id);
    this.fetchFormFieldsDetails();
  }

  fetchFormFieldsDetails() {
    this.formService.getFormFields(this.form_id).subscribe({
      next: (res: any) => {
        this.title = res.result.title;
        this.additionalFields = res.result.additionalFields.map((row: any) => ({
          fields: row.fields.map((field: any) => ({
            inputType: field.inputType,
            label: field.label,
            required: field.isrequired,
            options: field.options || []
          }))
        }));
        this.cdr.detectChanges(); 
      },
      error: (err: any) => {
        console.error("error in fetching formfields", err);
      }
    });
  }

  getFieldsListIds(): string[] {
    return [...this.additionalFields.map((_, index) => `field-list-${index}`), 'new-row-placeholder'];
  }

  
  getRowClass(row: any): any {
    const count = row.fields?.length || 0;
    
    if (count === 1) {
      return 'single-item';
    } else if (count === 2) {
      return 'two-items';
    } else {
      return ''; // Default styling for 3 or more items
    }
  }

  drop(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const draggedFieldType = event.item.data;

      if (event.container.id === 'new-row-placeholder') {
        this.additionalFields.push({
          fields: [{
            inputType: draggedFieldType,
            label: '',
            required: false,
            options: draggedFieldType === 'checkbox' || draggedFieldType === 'radio' ? [] : []
          }]
        });
      } else {
        const containerIdMatch = event.container.id.match(/field-list-(\d+)/);
        if (containerIdMatch) {
          const targetRowIndex = parseInt(containerIdMatch[1], 10);

          if (targetRowIndex >= 0 && targetRowIndex < this.additionalFields.length) {
            this.additionalFields[targetRowIndex].fields.push({
              inputType: draggedFieldType,
              label: '',
              required: false,
              options: draggedFieldType === 'checkbox' || draggedFieldType === 'radio' ? [] : []
            });
          }
        }
      }
      this.cdr.detectChanges();
    }
  }

  addField(rowIndex: number) {
    if (rowIndex >= 0 && rowIndex < this.additionalFields.length) {
      const newField: Field = { inputType: 'text', label: '', required: false, options: [] };
      this.additionalFields[rowIndex].fields.push(newField);
      this.cdr.detectChanges();
    }
  }


  addNewRow() {
    const newField: Field = { inputType: 'text', label: '', required: false, options: [] };
    const newRow: FormRow = { fields: [newField] };
    this.additionalFields.push(newRow);
    this.cdr.detectChanges();
  }

  
  removeField(rowIdx: number, fieldIdx: number) {
    if (rowIdx >= 0 && rowIdx < this.additionalFields.length) {
      this.additionalFields[rowIdx].fields.splice(fieldIdx, 1);
      
      if (this.additionalFields[rowIdx].fields.length === 0) {
        this.additionalFields.splice(rowIdx, 1);
      }
      this.cdr.detectChanges();
    }
  }


  onFieldTypeChange(rowIdx: number, fieldIdx: number, newType: string) {
    if (rowIdx >= 0 && rowIdx < this.additionalFields.length &&
      fieldIdx >= 0 && fieldIdx < this.additionalFields[rowIdx].fields.length) {
      this.additionalFields[rowIdx].fields[fieldIdx].inputType = newType;
      
      if (newType === 'checkbox' || newType === 'radio') {
        this.additionalFields[rowIdx].fields[fieldIdx].options = [];
      }
    }
  }

  onLabelChange(rowIdx: number, fieldIdx: number, newLabel: string) {
    if (rowIdx >= 0 && rowIdx < this.additionalFields.length &&
      fieldIdx >= 0 && fieldIdx < this.additionalFields[rowIdx].fields.length) {
      this.additionalFields[rowIdx].fields[fieldIdx].label = newLabel;
    }
  }

  onRequiredChange(rowIdx: number, fieldIdx: number, isRequired: boolean) {
    if (rowIdx >= 0 && rowIdx < this.additionalFields.length &&
      fieldIdx >= 0 && fieldIdx < this.additionalFields[rowIdx].fields.length) {
      this.additionalFields[rowIdx].fields[fieldIdx].required = isRequired;
    }
  }


  addOption(rowIdx: number, fieldIdx: number) {
    if (rowIdx >= 0 && rowIdx < this.additionalFields.length &&
      fieldIdx >= 0 && fieldIdx < this.additionalFields[rowIdx].fields.length) {
      if (!this.additionalFields[rowIdx].fields[fieldIdx].options) {
        this.additionalFields[rowIdx].fields[fieldIdx].options = [];
      }
      this.additionalFields[rowIdx].fields[fieldIdx].options.push('');
      this.cdr.detectChanges();
    }
  }

  removeOption(rowIdx: number, fieldIdx: number, optionIdx: number) {
    if (rowIdx >= 0 && rowIdx < this.additionalFields.length &&
      fieldIdx >= 0 && fieldIdx < this.additionalFields[rowIdx].fields.length &&
      optionIdx >= 0 && optionIdx < this.additionalFields[rowIdx].fields[fieldIdx].options.length) {
      this.additionalFields[rowIdx].fields[fieldIdx].options.splice(optionIdx, 1);
      this.cdr.detectChanges();
    }
  }

  noReturnPredicate() {
    return false;
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  onUpdate(event: Event): void {
    event.preventDefault();

    const updatedForm = {
      title: this.title,
      additionalFields: this.additionalFields.map(row => ({ // Map rows
        fields: row.fields.map(field => ({  // Map fields in each row
          label: field.label,
          inputType: field.inputType,
          isrequired: field.required,
          options: field.options
        }))
      }))
    };

    this.formUpdated = true; 

   
    setTimeout(() => {
      this.formUpdated = false;
    }, 3000);

    this.formService.updateFormFields(this.form_id, updatedForm).subscribe({
      next: (res: any) => {
        console.log("Form updated successfully!", res);
      },
      error: (err: any) => {
        console.error("Error updating form", err);
      }
    });
  }
}
