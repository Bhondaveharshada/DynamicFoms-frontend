import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormService } from '../services/form.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, moveItemInArray, CdkDragDrop } from '@angular/cdk/drag-drop';

interface Field { 
  id?: string;      // Add the ID field
  inputType: string;
  label: string;
  required: boolean;
  options: string[];
  allowMultipleSelection?: boolean;
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
    'dropdown',
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

  
generateUniqueId(): string {
  return 'field_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 9);
}

fetchFormFieldsDetails() {
  this.formService.getFormFields(this.form_id).subscribe({
    next: (res: any) => {
      this.title = res.result.title;
      this.additionalFields = res.result.additionalFields.map((row: any) => ({
        fields: row.fields.map((field: any) => ({
          id: field.id || this.generateUniqueId(), // Use existing ID or generate new one
          inputType: field.inputType,
          label: field.label,
          required: field.isrequired,
          options: field.options || [],
          allowMultipleSelection: field.inputType === 'dropdown' ? field.allowMultipleSelection || false : undefined
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
            id: this.generateUniqueId(),  // Add ID
            inputType: draggedFieldType,
            label: '',
            required: false,
            options: draggedFieldType === 'checkbox' || draggedFieldType === 'radio' || draggedFieldType === 'dropdown' ? [] : [],
            allowMultipleSelection: draggedFieldType === 'dropdown' ? false : undefined
          }]
        });
      } else {
        const containerIdMatch = event.container.id.match(/field-list-(\d+)/);
        if (containerIdMatch) {
          const targetRowIndex = parseInt(containerIdMatch[1], 10);
  
          if (targetRowIndex >= 0 && targetRowIndex < this.additionalFields.length) {
            this.additionalFields[targetRowIndex].fields.push({
              id: this.generateUniqueId(),  // Add ID
              inputType: draggedFieldType,
              label: '',
              required: false,
              options: draggedFieldType === 'checkbox' || draggedFieldType === 'radio' || draggedFieldType === 'dropdown' ? [] : [],
              allowMultipleSelection: draggedFieldType === 'dropdown' ? false : undefined
            });
          }
        }
      }
      this.cdr.detectChanges();
    }
  }

  addField(rowIndex: number) {
    if (rowIndex >= 0 && rowIndex < this.additionalFields.length) {
      const newField: Field = { 
        id: this.generateUniqueId(),  // Add ID to new fields
        inputType: 'text', 
        label: '', 
        required: false, 
        options: [],
        allowMultipleSelection: false
      };
      this.additionalFields[rowIndex].fields.push(newField);
      this.cdr.detectChanges();
    }
  }
  
  addNewRow() {
    const newField: Field = { 
      id: this.generateUniqueId(),  // Add ID to new fields
      inputType: 'text', 
      label: '', 
      required: false, 
      options: [],
      allowMultipleSelection: false
    };
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
  
      if (newType === 'checkbox' || newType === 'radio' || newType === 'dropdown') {
        this.additionalFields[rowIdx].fields[fieldIdx].options = [];
      }
  
      // Reset allowMultipleSelection for non-dropdown fields
      if (newType !== 'dropdown') {
        this.additionalFields[rowIdx].fields[fieldIdx].allowMultipleSelection = undefined;
      } else {
        this.additionalFields[rowIdx].fields[fieldIdx].allowMultipleSelection = false;
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
      additionalFields: this.additionalFields.map(row => ({
        fields: row.fields.map(field => ({
          id: field.id || this.generateUniqueId(), // Include ID in the update
          label: field.label,
          inputType: field.inputType,
          isrequired: field.required,
          options: field.options,
          allowMultipleSelection: field.inputType === 'dropdown' ? field.allowMultipleSelection : undefined
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