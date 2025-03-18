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

  // Update the drop method to use the new createNewField method
  drop(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
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
          }
        }
      }
      this.updateRowClasses();
      this.cdr.detectChanges();
    }
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

  validateNumberInput(event: KeyboardEvent) {
    const allowedChars = /[0-9.]/
    const inputChar = String.fromCharCode(event.keyCode);

    // Prevent multiple dots
    if (inputChar === '.' && (event.target as HTMLInputElement).value.includes('.')) {
      event.preventDefault();
    }

    if (!allowedChars.test(inputChar)) {
      event.preventDefault();
    }
  }

  // Update the field initialization to include visibility properties and soft validation
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
      visibilityCondition: null
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

  // Update the addField method to use the new createNewField method
  addField(rowIndex: number) {
    if (rowIndex >= 0 && rowIndex < this.additionalFields.length) {
      const newField = this.createNewField('text');
      this.additionalFields[rowIndex].fields.push(newField);
      this.cdr.detectChanges();
    }
    this.updateRowClasses();
  }

  // Update the addNewRow method to use the new createNewField method
  addNewRow() {
    const newField = this.createNewField('text');
    const newRow: FormRow = { fields: [newField] };
    this.additionalFields.push(newRow);
    this.cdr.detectChanges();

    console.log('Added new row. Total rows:', this.additionalFields.length);
  }

  /** Removes a Specific Field */
  removeField(rowIdx: number, fieldIdx: number) {
    if (rowIdx >= 0 && rowIdx < this.additionalFields.length) {
      this.additionalFields[rowIdx].fields.splice(fieldIdx, 1);
      // Remove the row if it's empty
      if (this.additionalFields[rowIdx].fields.length === 0) {
        this.additionalFields.splice(rowIdx, 1);
      }
      this.cdr.detectChanges();
    }
    this.updateRowClasses();
  }

  /** Handles Field Type Change */
  onFieldTypeChange(rowIdx: number, fieldIdx: number, newType: string) {
    if (rowIdx >= 0 && rowIdx < this.additionalFields.length &&
        fieldIdx >= 0 && fieldIdx < this.additionalFields[rowIdx].fields.length) {
      this.additionalFields[rowIdx].fields[fieldIdx].inputType = newType;
      // Initialize options array for checkbox/radio
      if (newType === 'checkbox' || newType === 'radio' || newType === 'dropdown') {
        this.additionalFields[rowIdx].fields[fieldIdx].options = [];
      }
    }
  }

  /** Handles Label Change */
  onLabelChange(rowIdx: number, fieldIdx: number, newLabel: string) {
    if (rowIdx >= 0 && rowIdx < this.additionalFields.length &&
        fieldIdx >= 0 && fieldIdx < this.additionalFields[rowIdx].fields.length) {
      this.additionalFields[rowIdx].fields[fieldIdx].label = newLabel;
    }
  }

  /** Handles Required Checkbox */
  onRequiredChange(rowIdx: number, fieldIdx: number, isRequired: boolean) {
    if (rowIdx >= 0 && rowIdx < this.additionalFields.length &&
        fieldIdx >= 0 && fieldIdx < this.additionalFields[rowIdx].fields.length) {
      this.additionalFields[rowIdx].fields[fieldIdx].required = isRequired;
    }
  }

  /** Adds an Option (for Checkbox/Radio Fields) */
  addOption(rowIdx: number, fieldIdx: number) {
    if (rowIdx >= 0 && rowIdx < this.additionalFields.length &&
        fieldIdx >= 0 && fieldIdx < this.additionalFields[rowIdx].fields.length) {
      if (!this.additionalFields[rowIdx].fields[fieldIdx].options) {
        this.additionalFields[rowIdx].fields[fieldIdx].options = [];
      }
      this.additionalFields[rowIdx].fields[fieldIdx].options.push('');
    }
  }

  /** Removes an Option */
  removeOption(rowIdx: number, fieldIdx: number, optionIdx: number) {
    if (rowIdx >= 0 && rowIdx < this.additionalFields.length &&
        fieldIdx >= 0 && fieldIdx < this.additionalFields[rowIdx].fields.length &&
        optionIdx >= 0 && optionIdx < this.additionalFields[rowIdx].fields[fieldIdx].options.length) {
      this.additionalFields[rowIdx].fields[fieldIdx].options.splice(optionIdx, 1);
    }
  }

  /** Fetch All Forms */
  fetchForms() {
    this.formService.getAllFormFields().subscribe({
      next: (res: any) => {
        this.formFields = res.result || [];
        console.log('Fetched forms:', this.formFields);
      },
      error: (err: any) => console.error('Error fetching forms:', err),
    });
  }

  // Enhanced evaluateVisibilityCondition method to properly evaluate conditions
  evaluateVisibilityCondition(field: any, formValues: any): boolean {
    // If there's no visibility condition, the field is always visible
    if (!field.hasVisibilityCondition || !field.visibilityCondition) {
      return true;
    }

    try {
      // Parse the condition to create a proper function
      let condition = field.visibilityCondition;
      
      // Create a context object for evaluation
      const context: {[key: string]: any} = {};
      
      // Extract all field references (text within single quotes)
      const fieldReferences = condition.match(/'([^']+)'/g) || [];
      
      // For each referenced field, set up the corresponding value in the context
      for (const ref of fieldReferences) {
        const fieldName = ref.replace(/'/g, '');
        
        // Find the field with this label
        let fieldValue = null;
        for (const rowKey in formValues) {
          const fieldInfo = this.findFieldById(rowKey);
          if (fieldInfo && fieldInfo.field.label === fieldName) {
            fieldValue = formValues[rowKey];
            break;
          }
        }
        
        // Replace all instances of this field reference with its value accessor
        condition = condition.replace(new RegExp(`'${fieldName}'`, 'g'), `context['${fieldName}']`);
        
        // Store the value in the context
        context[fieldName] = fieldValue;
      }
      
      // Create and execute the evaluation function
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
      // If there's an error, default to showing the field
      return true;
    }
  }

  // Update the onSave method to include visibility condition data and soft validation
  onSave(event: Event) {
    event.preventDefault();
    this.formSubmitted = true;

    // Validate fields
    let isValid = true;
    const validationMessages: string[] = [];

    // If validation passes, proceed to save the form
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
          options: field.options || [],
          allowMultipleSelection: field.inputType === 'dropdown' ? field.allowMultipleSelection : undefined,
          hasVisibilityCondition: field.hasVisibilityCondition || false,
          visibilityCondition: field.visibilityCondition
        }))
      }))
    };

    // Log the exact data being sent to the server
    console.log("Sending form data structure:", JSON.stringify(formData, null, 2));

    const formId = new Date().getTime();

    // Show loading indicator
    Swal.fire({
      title: 'Saving...',
      text: 'Please wait',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.formService.addFormFields(formData, formId).subscribe({
      next: (res: any) => {
        Swal.close();
        console.log('Form saved successfully:', res);
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
      console.error('Missing form link or ID');
      return;
    }

    // Show loading indicator
    const savingToast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false
    });
    savingToast.fire({ title: 'Saving link...', icon: 'info' });

    this.formService.saveFormLink(this._id, this.formLink).subscribe({
      next: (res: any) => {
        this.isLinkSaved = true;
        console.log('Link saved successfully:', res);
        savingToast.close();

        // Show success toast
        Swal.mixin({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        }).fire({ title: 'Link saved successfully!', icon: 'success' });
      },
      error: (err: any) => {
        console.error('Error saving link:', err);
        savingToast.close();

        // Show error toast
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

  /** Processes AI Prompt */
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
            // Ensure each field has an ID
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
          console.error('Error parsing prompt response:', error);
          Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to parse the generated JSON structure.' });
        }
      },
      error: (err) => {
        Swal.close();
        console.error('Error processing prompt:', err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'An error occurred while processing the prompt.' });
      }
    });
  }

  /** Resets the Form */
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