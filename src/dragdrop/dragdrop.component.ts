import { Component, ChangeDetectorRef } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormService } from '../services/form.service';
import { OpenaiService } from '../app/openai/openai.service';
import Swal from 'sweetalert2';
import {MatButtonToggleModule} from '@angular/material/button-toggle';

interface Field {
  id: string; // Add unique identifier
  inputType: string;
  label: string;
  required: boolean;
  validateNumber: boolean;
  softValidation : boolean;
  numberValidation: string | null;
  options: string[];
  allowMultipleSelection?: boolean;
}

interface FormRow {
  fields: Field[];
}

@Component({
  selector: 'app-dragdrop',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, DragDropModule,MatButtonToggleModule],
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
    } else {
      const draggedFieldType = event.item.data;

      if (event.container.id === 'new-row-placeholder') {
        this.additionalFields.push({
          fields: [{
            id: this.generateFieldId(),
            inputType: draggedFieldType,
            label: '',
            required: false,
            validateNumber:false,
            numberValidation: null,
            softValidation: false,
            options: draggedFieldType === 'checkbox' || draggedFieldType === 'radio' ? [] : [],
            allowMultipleSelection: draggedFieldType === 'dropdown' ? false : undefined
          }]
        });
      } else {
        const containerIdMatch = event.container.id.match(/field-list-(\d+)/);
        if (containerIdMatch) {
          const targetRowIndex = parseInt(containerIdMatch[1], 10);

          if (targetRowIndex >= 0 && targetRowIndex < this.additionalFields.length) {
            this.additionalFields[targetRowIndex].fields.push({
              id: this.generateFieldId(),
              inputType: draggedFieldType,
              label: '',
              required: false,
              validateNumber:false,
              numberValidation: null,
              softValidation: false,
              options: draggedFieldType === 'checkbox' || draggedFieldType === 'radio' || draggedFieldType === 'dropdown' ? [] : [],
              allowMultipleSelection: draggedFieldType === 'dropdown' ? false : undefined
            });
          }
        }
      }
      this.updateRowClasses();
      this.cdr.detectChanges();
    }
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


    updateRowClasses() {
      this.additionalFields.forEach(row => {
          if (row.fields.length === 1) {

          } else {
              // row.classList.remove('single-item');
          }
      });
  }


  addField(rowIndex: number) {
    if (rowIndex >= 0 && rowIndex < this.additionalFields.length) {
      const newField: Field = {
        id: this.generateFieldId(),
        inputType: 'text',
        label: '',
        required: false,
        validateNumber:false,
        softValidation: false,
        numberValidation: null,
        options: []
      };
      this.additionalFields[rowIndex].fields.push(newField);
      this.cdr.detectChanges();
    }
    this.updateRowClasses();
  }
  addNewRow() {
    const newField: Field = {
      id: this.generateFieldId(),
      inputType: 'text',
      label: '',
      required: false,
      validateNumber:false,
      softValidation: false,
      numberValidation: null,
      options: []
    };
    const newRow: FormRow = { fields: [newField] };
    this.additionalFields.push(newRow);
    this.cdr.detectChanges();

    console.log('Added new row. Total rows:', this.additionalFields.length);
    console.log('New row structure:', JSON.stringify(newRow));
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
      }    }
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
          id: field.id, // Include the field ID
          label: field.label || 'Untitled',
          inputType: field.inputType,
          isrequired: field.required,
          validateNumber: field.validateNumber,
          softValidation: field.softValidation,
          numberValidation: field.numberValidation,
          options: field.options || [],
          allowMultipleSelection: field.inputType === 'dropdown' ? field.allowMultipleSelection : undefined
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
