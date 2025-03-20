import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormService } from '../services/form.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, moveItemInArray, CdkDragDrop } from '@angular/cdk/drag-drop';
import Swal from 'sweetalert2';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

interface Field {
  id: string;
  inputType: string;
  label: string;
  required: boolean;
  validateNumber: boolean;
  softValidation: boolean;
  numberValidation: string | null;
  dateValidation: boolean;
  dateFieldType: string | null;
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
  imports: [CommonModule, RouterModule, FormsModule, DragDropModule, MatButtonToggleModule],
  templateUrl: './updateform.component.html',
  styleUrl: './updateform.component.css'
})
export class UpdateformComponent implements OnInit {

  form_id: any;
  formUpdated = false;
  title: string = '';
  additionalFields: FormRow[] = [];
  formLink: string | null = null;
  isLinkSaved = false;
  showPromptInput = false;
  prompt = '';
  promptResponse = '';
  formSubmitted: boolean = false;

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

  getFieldsListIds(): string[] {
    return [...this.additionalFields.map((_, index) => `field-list-${index}`), 'new-row-placeholder'];
  }

  private generateFieldId(): string {
    return 'field_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000);
  }

  getRowClass(row: any): string {
    let classes = 'form-row-container';

    if (row.fields && row.fields.length === 1) {
      classes += ' single-item';
    }
    else if (row.fields && row.fields.length === 2) {
      classes += ' two-items';
    }

    return classes;
  }

  drop(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);

      const containerIdMatch = event.container.id.match(/field-list-(\d+)/);
      if (containerIdMatch) {
        const rowIdx = parseInt(containerIdMatch[1], 10);
        this.updateDateFieldTypes(rowIdx);
      }
    } else {
      const draggedFieldType = event.item.data;

      if (event.container.id === 'new-row-placeholder') {
        this.additionalFields.push({
          fields: [this.createNewField(draggedFieldType)]
        });
      } else {
        const containerIdMatch = event.container.id.match(/field-list-(\d+)/);
        if (containerIdMatch) {
          const targetRowIndex = parseInt(containerIdMatch[1], 10);

          if (targetRowIndex >= 0 && targetRowIndex < this.additionalFields.length) {
            this.additionalFields[targetRowIndex].fields.push(this.createNewField(draggedFieldType));
            this.updateDateFieldTypes(targetRowIndex);
          }
        }
      }
      this.updateRowClasses();
      this.cdr.detectChanges();
    }
  }

  showFieldPicker(rowIdx: number, fieldIdx: number) {
    const currentCondition = this.additionalFields[rowIdx].fields[fieldIdx].visibilityCondition || '';
    const availableFields = this.getAllFieldsExcept(rowIdx, fieldIdx);
    const fieldsHtml = this.formatFieldsForDialog(availableFields);

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
        document.querySelectorAll('.insert-operator').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const operator = target.getAttribute('data-op');
            const conditionInput = document.getElementById('condition-expression') as HTMLInputElement;
            conditionInput.value += ` ${operator} `;
            conditionInput.focus();
          });
        });

        document.querySelectorAll('.field-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const fieldName = target.getAttribute('data-field');
            const conditionInput = document.getElementById('condition-expression') as HTMLInputElement;
            conditionInput.value += `'${fieldName}'`;
            conditionInput.focus();
          });
        });

        document.querySelectorAll('.option-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const optionValue = target.getAttribute('data-option');
            const conditionInput = document.getElementById('condition-expression') as HTMLInputElement;
            conditionInput.value += `'${optionValue}'`;
            conditionInput.focus();
          });
        });
      },
      preConfirm: () => {
        const conditionInput = document.getElementById('condition-expression') as HTMLInputElement;
        return conditionInput.value;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.additionalFields[rowIdx].fields[fieldIdx].visibilityCondition = result.value as string;
        this.cdr.detectChanges();
      }
    });
  }

  getAllFieldsExcept(currentRowIdx: number, currentFieldIdx: number): Array<{ label: string, inputType: string, options?: string[] }> {
    const fields: Array<{ label: string, inputType: string, options?: string[] }> = [];

    this.additionalFields.forEach((row, rowIdx) => {
      row.fields.forEach((field, fieldIdx) => {
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

  formatFieldsForDialog(fields: Array<{ label: string, inputType: string, options?: string[] }>): string {
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

  validateNumberInput(event: KeyboardEvent) {
    const allowedChars = /[0-9.]/
    const inputChar = String.fromCharCode(event.keyCode);

    if (inputChar === '.' && (event.target as HTMLInputElement).value.includes('.')) {
      event.preventDefault();
    }

    if (!allowedChars.test(inputChar)) {
      event.preventDefault();
    }
  }

  private createNewField(inputType: string): Field {
    return {
      id: this.generateFieldId(),
      inputType: inputType,
      label: '',
      required: false,
      validateNumber: false,
      softValidation: false,
      numberValidation: null,
      options: inputType === 'checkbox' || inputType === 'radio' || inputType === 'dropdown' ? [] : [],
      allowMultipleSelection: inputType === 'dropdown' ? false : undefined,
      hasVisibilityCondition: false,
      visibilityCondition: null,
      dateValidation: false,
      dateFieldType: null,
    };
  }

  updateRowClasses() {
    this.additionalFields.forEach(row => {
      if (row.fields.length === 1) {
      } else {
        // Multiple items logic
      }
    });
  }

  addField(rowIndex: number) {
    if (rowIndex >= 0 && rowIndex < this.additionalFields.length) {
      const newField = this.createNewField('text');
      this.additionalFields[rowIndex].fields.push(newField);
      this.cdr.detectChanges();
    }
    this.updateRowClasses();
  }

  addNewRow() {
    const newField = this.createNewField('text');
    const newRow: FormRow = { fields: [newField] };
    this.additionalFields.push(newRow);
    this.cdr.detectChanges();

    console.log('Added new row. Total rows:', this.additionalFields.length);
  }

  hasAnotherDateField(rowIdx: number, fieldIdx: number): boolean {
    const row = this.additionalFields[rowIdx];
    return row.fields.some((f, idx) => f.inputType === 'date' && idx !== fieldIdx);
  }

  updateDateFieldTypes(rowIdx: number): void {
    const row = this.additionalFields[rowIdx];
    const dateFields = row.fields
      .filter(f => f.inputType === 'date' && f.dateValidation)
      .sort((a, b) => row.fields.indexOf(a) - row.fields.indexOf(b));

    if (dateFields.length === 2) {
      dateFields[0].dateFieldType = 'start';
      dateFields[1].dateFieldType = 'end';
    } else {
      dateFields.forEach(field => (field.dateFieldType = null));
    }
  }

  removeField(rowIdx: number, fieldIdx: number) {
    if (rowIdx >= 0 && rowIdx < this.additionalFields.length) {
      this.additionalFields[rowIdx].fields.splice(fieldIdx, 1);
      if (this.additionalFields[rowIdx].fields.length === 0) {
        this.additionalFields.splice(rowIdx, 1);
      }
      this.cdr.detectChanges();
    }
    this.updateRowClasses();
  }

  onFieldTypeChange(rowIdx: number, fieldIdx: number, newType: string) {
    if (rowIdx >= 0 && rowIdx < this.additionalFields.length &&
      fieldIdx >= 0 && fieldIdx < this.additionalFields[rowIdx].fields.length) {
      this.additionalFields[rowIdx].fields[fieldIdx].inputType = newType;
      if (newType === 'checkbox' || newType === 'radio' || newType === 'dropdown') {
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
    }
  }

  removeOption(rowIdx: number, fieldIdx: number, optionIdx: number) {
    if (rowIdx >= 0 && rowIdx < this.additionalFields.length &&
      fieldIdx >= 0 && fieldIdx < this.additionalFields[rowIdx].fields.length &&
      optionIdx >= 0 && optionIdx < this.additionalFields[rowIdx].fields[fieldIdx].options.length) {
      this.additionalFields[rowIdx].fields[fieldIdx].options.splice(optionIdx, 1);
    }
  }

  noReturnPredicate() {
    return false;
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  fetchFormFieldsDetails() {
    this.formService.getFormFields(this.form_id).subscribe({
      next: (res: any) => {
        this.title = res.result.title;
        this.additionalFields = res.result.additionalFields.map((row: any) => ({
          fields: row.fields.map((field: any) => ({
            id: field.id || this.generateFieldId(),
            inputType: field.inputType,
            label: field.label,
            required: field.isrequired,
            validateNumber: field.validateNumber,
            softValidation: field.softValidation,
            numberValidation: field.numberValidation,
            dateValidation: field.dateValidation,
            dateFieldType: field.dateFieldType,
            options: field.options || [],
            allowMultipleSelection: field.inputType === 'dropdown' ? field.allowMultipleSelection || false : undefined,
            hasVisibilityCondition: field.hasVisibilityCondition || false,
            visibilityCondition: field.visibilityCondition || null,
          }))
        }));
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error("error in fetching formfields", err);
      }
    });
  }

  onUpdate(event: Event): void {
    event.preventDefault();

    const updatedForm = {
      title: this.title,
      additionalFields: this.additionalFields.map(row => ({
        fields: row.fields.map(field => ({
          id: field.id || this.generateFieldId(),
          label: field.label,
          inputType: field.inputType,
          required: field.required,
          validateNumber: field.validateNumber,
          softValidation: field.softValidation,
          numberValidation: field.numberValidation,
          dateValidation: field.dateValidation,
          dateFieldType: field.dateFieldType,
          options: field.options,
          allowMultipleSelection: field.inputType === 'dropdown' ? field.allowMultipleSelection : undefined,
          hasVisibilityCondition: field.hasVisibilityCondition,
          visibilityCondition: field.visibilityCondition
        }))
      }))
    };

    this.formService.updateFormFields(this.form_id, updatedForm).subscribe({
      next: (response: any) => {
        console.log('Form updated successfully', response);
        this.formUpdated = true;
        setTimeout(() => {
          this.formUpdated = false;
        }, 3000);
      },
      error: (error: any) => {
        console.error('Error updating form:', error);
      }
    });
  }
}