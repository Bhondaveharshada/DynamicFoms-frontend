import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormService } from '../services/form.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, moveItemInArray, CdkDragDrop } from '@angular/cdk/drag-drop';
import Swal from 'sweetalert2';

interface Field { 
  id?: string;      // Add the ID field
  inputType: string;
  label: string;
  required: boolean;
  options: string[];
  allowMultipleSelection?: boolean;
  hasVisibilityCondition: boolean;
  visibilityCondition: string | null;
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

// Helper method to get all fields except the current one
getAllFieldsExcept(currentRowIdx: number, currentFieldIdx: number): Array<{label: string, inputType: string, options?: string[]}> {
  const fields: Array<{label: string, inputType: string, options?: string[]}> = [];
  
  this.additionalFields.forEach((row, rowIdx) => {
    row.fields.forEach((field, fieldIdx) => {
      // Skip the current field and fields without labels
      if (!(rowIdx === currentRowIdx && fieldIdx === currentFieldIdx) && field.label?.trim()) {
        fields.push({
          label: field.label,
          inputType: field.inputType,
          options: field.options && field.options.length > 0 ? field.options : undefined
        });
      }
    });
  });
  
  return fields;
}

// Improved formatFieldsForDialog to better support building expressions
formatFieldsForDialog(fields: Array<{label: string, inputType: string, options?: string[]}>): string {
  let html = '';
  
  if (fields.length === 0) {
    return '<div class="alert alert-info">No other fields available for conditions.</div>';
  }
  
  fields.forEach(field => {
    html += `
      <div class="card mb-2">
        <div class="card-header d-flex justify-content-between align-items-center py-1">
          <button class="btn btn-sm btn-outline-primary field-btn" data-field="${field.label}">
            ${field.label} (${field.inputType})
          </button>
        </div>
    `;
    
    // If the field has options, show them for selection
    if ((field.inputType === 'checkbox' || field.inputType === 'radio' || field.inputType === 'dropdown') && 
        field.options && field.options.length > 0) {
      html += `<div class="card-body py-2">`;
      
      field.options.forEach(option => {
        if (option.trim()) {
          html += `
            <button class="btn btn-sm btn-outline-secondary me-1 mb-1 option-btn" data-option="${option}">
              ${option}
            </button>
          `;
        }
      });
      
      html += `</div>`;
    }
    
    // For checkbox, add true/false options
    if (field.inputType === 'checkbox') {
      html += `
        <div class="card-body py-2">
          <small class="d-block mb-1">Boolean values:</small>
          <button class="btn btn-sm btn-outline-success me-1 option-btn" data-option="true">true</button>
          <button class="btn btn-sm btn-outline-danger option-btn" data-option="false">false</button>
        </div>
      `;
    }
    
    html += `</div>`;
  });
  
  return html;
}

// Updated showFieldPicker method to better handle building expressions
showFieldPicker(rowIdx: number, fieldIdx: number) {
  // Get the current visibility condition (if any)
  const currentCondition = this.additionalFields[rowIdx].fields[fieldIdx].visibilityCondition || '';
  
  // Create a list of available fields excluding the current field
  const availableFields = this.getAllFieldsExcept(rowIdx, fieldIdx);
  
  // Create a formatted HTML string for the Swal dialog
  const fieldsHtml = this.formatFieldsForDialog(availableFields);
  
  // Create a UI that helps users build conditions
  Swal.fire({
    title: 'Build Field Visibility Condition',
    html: `
      <div class="mb-3">
        <label class="form-label">Current Condition:</label>
        <input id="condition-expression" class="form-control" value="${currentCondition}">
        <small class="text-muted">Example: 'Gender' == 'Male' && 'Subscribe' == true</small>
      </div>
      
      <div class="mb-3">
        <div class="btn-group mb-2">
          <button class="btn btn-sm btn-outline-secondary insert-operator" data-op="&&">AND (&&)</button>
          <button class="btn btn-sm btn-outline-secondary insert-operator" data-op="||">OR (||)</button>
          <button class="btn btn-sm btn-outline-secondary insert-operator" data-op="==">EQUALS (==)</button>
          <button class="btn btn-sm btn-outline-secondary insert-operator" data-op="!=">NOT EQUALS (!=)</button>
        </div>
      </div>
      
      <div class="form-fields-list border p-2" style="max-height: 300px; overflow-y: auto;">
        <h6>Available Fields:</h6>
        ${fieldsHtml}
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'Apply Condition',
    width: '600px',
    didOpen: () => {
      // Set up handlers for the operator buttons
      document.querySelectorAll('.insert-operator').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          const operator = target.getAttribute('data-op');
          const conditionInput = document.getElementById('condition-expression') as HTMLInputElement;
          
          // Add a space before and after the operator
          conditionInput.value += ` ${operator} `;
          conditionInput.focus();
        });
      });
      
      // Set up handlers for field buttons
      document.querySelectorAll('.field-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          const fieldName = target.getAttribute('data-field');
          const conditionInput = document.getElementById('condition-expression') as HTMLInputElement;
          
          // Insert field name at cursor position
          conditionInput.value += `'${fieldName}'`;
          conditionInput.focus();
        });
      });
      
      // Set up handlers for option buttons
      document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          const optionValue = target.getAttribute('data-option');
          const conditionInput = document.getElementById('condition-expression') as HTMLInputElement;
          
          // Insert option value at cursor position
          conditionInput.value += `'${optionValue}'`;
          conditionInput.focus();
        });
      });
    },
    preConfirm: () => {
      // Get the final condition and save it
      const conditionInput = document.getElementById('condition-expression') as HTMLInputElement;
      return conditionInput.value;
    }
  }).then((result) => {
    if (result.isConfirmed) {
      // Update the visibility condition in the form
      this.additionalFields[rowIdx].fields[fieldIdx].visibilityCondition = result.value as string;
      this.cdr.detectChanges();
    }
  });
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
          allowMultipleSelection: field.inputType === 'dropdown' ? field.allowMultipleSelection || false : undefined,
          hasVisibilityCondition: field.hasVisibilityCondition || false,
          visibilityCondition: field.visibilityCondition || null
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
            allowMultipleSelection: draggedFieldType === 'dropdown' ? false : undefined,
            hasVisibilityCondition: false,
            visibilityCondition: null
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
              allowMultipleSelection: draggedFieldType === 'dropdown' ? false : undefined,
              hasVisibilityCondition: false,
              visibilityCondition: null
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
        allowMultipleSelection: false,
        hasVisibilityCondition: false,
        visibilityCondition: null
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
      allowMultipleSelection: false,
      hasVisibilityCondition: false,
      visibilityCondition: null
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
        allowMultipleSelection: field.inputType === 'dropdown' ? field.allowMultipleSelection : undefined,
        hasVisibilityCondition: field.hasVisibilityCondition || false,
        visibilityCondition: field.visibilityCondition
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