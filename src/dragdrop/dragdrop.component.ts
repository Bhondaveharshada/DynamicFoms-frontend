import { Component, ChangeDetectorRef } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormService } from '../services/form.service';
import { OpenaiService } from '../app/openai/openai.service';
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
  selector: 'app-dragdrop',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, DragDropModule, MatButtonToggleModule],
  templateUrl: './dragdrop.component.html',
  styleUrl: './dragdrop.component.css'
})
export class DragdropComponent {
  constructor(private formService: FormService, private openaiService: OpenaiService, private cdr: ChangeDetectorRef) { }

  title: string = '';
  formLink: string | null = null;
  _id: any;
  isLinkSaved = false;
  showPromptInput = false;
  prompt = '';
  promptResponse = '';
  formFields: any[] = [];
  formSubmitted: boolean = false;

  all = ['text', 'number', 'email', 'password', 'date', 'checkbox', 'radio', 'dropdown', 'textarea'];
  additionalFields: FormRow[] = [];

  newRowPlaceholder: any[] = [];

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

 
  getAllFieldsExcept(currentRowIdx: number, currentFieldIdx: number): Array<{label: string, inputType: string, options?: string[]}> {
    const fields: Array<{label: string, inputType: string, options?: string[]}> = [];

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
      dateFieldType:null,
    };
  }

  updateRowClasses() {
    this.additionalFields.forEach(row => {
      if (row.fields.length === 1) {
        // Single item logic
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

  fetchForms() {
    this.formService.getAllFormFields().subscribe({
      next: (res: any) => {
        this.formFields = res.result || [];
        console.log('Fetched forms:', this.formFields);
      },
      error: (err: any) => console.error('Error fetching forms:', err),
    });
  }

  evaluateVisibilityCondition(field: any, formValues: any): boolean {
    if (!field.hasVisibilityCondition || !field.visibilityCondition) {
      return true;
    }

    try {
      let condition = field.visibilityCondition;
      const context: {[key: string]: any} = {};
      const fieldReferences = condition.match(/'([^']+)'/g) || [];

      for (const ref of fieldReferences) {
        const fieldName = ref.replace(/'/g, '');
        let fieldValue = null;
        for (const rowKey in formValues) {
          const fieldInfo = this.findFieldById(rowKey);
          if (fieldInfo && fieldInfo.field.label === fieldName) {
            fieldValue = formValues[rowKey];
            break;
          }
        }

        condition = condition.replace(new RegExp(`'${fieldName}'`, 'g'), `context['${fieldName}']`);

        context[fieldName] = fieldValue;
      }

      const evaluator = new Function('context', `
        try {
          return ${condition};
        } catch (e) {
          console.error('Condition evaluation error:', e);
          return true;
        }
      `);

      return evaluator(context);
    } catch (error) {
      console.error('Error evaluating visibility condition:', error);
      return true;
    }
  }

  onSave(event: Event) {
    event.preventDefault();
    this.formSubmitted = true;

    let isValid = true;
    const validationMessages: string[] = [];

    const formData = {
      title: this.title,
      additionalFields: this.additionalFields.map(row => ({
        fields: row.fields.map(field => ({
          id: field.id,
          label: field.label || 'Untitled',
          inputType: field.inputType,
          isrequired: field.required,
          validateNumber: field.validateNumber,
          softValidation: field.softValidation,
          numberValidation: field.numberValidation,
          dateValidation: field.dateValidation,
          dateFieldType: field.dateFieldType,
          options: field.options || [],
          allowMultipleSelection: field.inputType === 'dropdown' ? field.allowMultipleSelection : undefined,
          hasVisibilityCondition: field.hasVisibilityCondition || false,
          visibilityCondition: field.visibilityCondition
        }))
      }))
    };

    const formId = new Date().getTime();
    Swal.fire({
      title: 'Saving...',
      text: 'Please wait',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

     this.formService.addFormFields(formData, formId).subscribe({
      next: (res: any) => {
        Swal.close();
        const id = res.result._id;
        this._id = id;
        this.formLink = `${window.location.origin}/form/${id}/${formId}`;
        Swal.fire({ icon: 'success', title: 'Success', text: 'Form saved successfully!' });
        this.saveLink();
        this.fetchForms();
      },
      error: (err: any) => {
        Swal.close();
        let errorMessage = 'An unknown error occurred';
        if (err.error && err.error.message) {
          errorMessage = err.error.message;
        }
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: `Failed to save form: ${errorMessage}`
        });
      },
    });
  }

  saveLink() {
    if (!this.formLink || !this._id) {
      return;
    }

    const savingToast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false
    });
    savingToast.fire({ title: 'Saving link...', icon: 'info' });

    this.formService.saveFormLink(this._id, this.formLink).subscribe({
      next: (res: any) => {
        this.isLinkSaved = true;
        savingToast.close();

        Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        }).fire({ title: 'Link saved successfully!', icon: 'success' });
      },
      error: (err: any) => {
        savingToast.close();

        Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        }).fire({ title: 'Failed to save link', icon: 'error' });
      },
    });
  }

  findFieldById(fieldId: string): { field: Field, rowIndex: number, fieldIndex: number } | null {
    for (let rowIndex = 0; rowIndex < this.additionalFields.length; rowIndex++) {
      const row = this.additionalFields[rowIndex];
      for (let fieldIndex = 0; fieldIndex < row.fields.length; fieldIndex++) {
        const field = row.fields[fieldIndex];
        if (field.id === fieldId) {
          return { field, rowIndex, fieldIndex };
        }
      }
    }
    return null;
  }

  processPrompt() {
    if (!this.prompt) return;

    let prompt = `I have specified the fields I want in my form. ` + this.prompt + ` Generate a valid JSON structure for the form.`;

    Swal.fire({ title: 'Processing...', text: 'Generating JSON structure, please wait.', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    this.openaiService.generateResponse(prompt).subscribe({
      next: (res) => {
        Swal.close();
        this.promptResponse = res.choices[0].message.content;
        try {
          const parsedResponse = JSON.parse(this.promptResponse);
          if (parsedResponse && parsedResponse.additionalFields) {
      
            parsedResponse.additionalFields.forEach((row: FormRow) => {
              row.fields.forEach((field: Field) => {
                if (!field.id) {
                  field.id = this.generateFieldId();
                }
              });
            });
            this.additionalFields = parsedResponse.additionalFields;
            this.cdr.detectChanges();
          } else {
            throw new Error('Invalid response format');
          }
        } catch (error) {
          Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to parse the generated JSON structure.' });
        }
      },
      error: (err) => {
        Swal.close();
        Swal.fire({ icon: 'error', title: 'Error', text: 'An error occurred while processing the prompt.' });
      }
    });
  }

  resetForm() {
    this.title = '';
    this.additionalFields = [];
    this.formLink = null;
    this.cdr.detectChanges();
  }

  trackByIndex(index: number, item: any): number {
    return index;
  }

  noReturnPredicate() {
    return false;
  }
}
