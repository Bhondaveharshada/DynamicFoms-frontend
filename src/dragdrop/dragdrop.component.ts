import { Component } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormService } from '../services/form.service';
import { ChangeDetectorRef } from '@angular/core';
import { OpenaiService } from '../app/openai/openai.service';
import Swal from 'sweetalert2';

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
  selector: 'app-dragdrop',
  imports: [RouterModule, CommonModule, FormsModule, DragDropModule],
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

  all = ['text', 'number', 'email', 'password', 'date', 'checkbox', 'radio', 'textarea'];

  additionalFields: FormRow[] = [];
  
  // Hidden container for new row creation
  newRowPlaceholder: any[] = [];

  /** Get all field list IDs for connecting drop lists */
  getFieldsListIds(): string[] {
    // Include field lists and the new row placeholder
    return [...this.additionalFields.map((_, index) => `field-list-${index}`), 'new-row-placeholder'];
  }

  /** 
   * Enhanced drop handler that supports:
   * 1. Moving within the same container
   * 2. Adding fields to existing rows
   * 3. Creating new rows when dropping to the hidden row placeholder
   */
  drop(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      // Moving within the same container
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const draggedFieldType = event.item.data;
      
      // Check if we're dropping into the new row placeholder
      if (event.container.id === 'new-row-placeholder') {
        // Create a new row with this field
        this.additionalFields.push({
          fields: [{
            inputType: draggedFieldType,
            label: '',
            required: false,
            options: draggedFieldType === 'checkbox' || draggedFieldType === 'radio' ? [] : []
          }]
        });
      } else {
        // Check if we're adding to an existing row by finding its index
        const containerIdMatch = event.container.id.match(/field-list-(\d+)/);
        if (containerIdMatch) {
          const targetRowIndex = parseInt(containerIdMatch[1], 10);
          
          // Ensure the row exists
          if (targetRowIndex >= 0 && targetRowIndex < this.additionalFields.length) {
            // Add the field to the existing row
            this.additionalFields[targetRowIndex].fields.push({
              inputType: draggedFieldType,
              label: '',
              required: false,
              options: draggedFieldType === 'checkbox' || draggedFieldType === 'radio' ? [] : []
            });
          }
        }
      }
      
      // Trigger change detection
      this.cdr.detectChanges();
    }
  }

  /** Adds a New Field */
  addField(rowIndex: number) {
    if (rowIndex >= 0 && rowIndex < this.additionalFields.length) {
      const newField: Field = { inputType: 'text', label: '', required: false, options: [] };
      this.additionalFields[rowIndex].fields.push(newField);
      this.cdr.detectChanges();
    }
  }

  /** Adds a new row with one default field */
  addNewRow() {
    const newField: Field = { inputType: 'text', label: '', required: false, options: [] };
    const newRow: FormRow = { fields: [newField] };
    this.additionalFields.push(newRow);
    this.cdr.detectChanges();
    
    // For debugging
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
  }

  /** Handles Field Type Change */
  onFieldTypeChange(rowIdx: number, fieldIdx: number, newType: string) {
    if (rowIdx >= 0 && rowIdx < this.additionalFields.length &&
        fieldIdx >= 0 && fieldIdx < this.additionalFields[rowIdx].fields.length) {
      this.additionalFields[rowIdx].fields[fieldIdx].inputType = newType;
      // Initialize options array for checkbox/radio
      if (newType === 'checkbox' || newType === 'radio') {
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

  /** Saves Form */
  onSave(event: Event) {
    event.preventDefault();

    const formData = {
      title: this.title,
      additionalFields: this.additionalFields.map(row => ({
        fields: row.fields.map(field => ({
          label: field.label,
          inputType: field.inputType,
          isrequired: field.required,
          options: field.options || []
        }))
      }))
    };
    console.log("formData : ", formData);
    const formId = new Date().getTime();
    this.formService.addFormFields(formData, formId).subscribe({
      next: (res: any) => {

        const id = res.result._id;
        this._id = id;
        this.formLink = `${window.location.origin}/form/${id}/${formId}`;
        console.log('formlink form onsave fun', typeof this.formLink, this.formLink);
        const stringLink = `${this.formLink}`;
        console.log('String link', String(stringLink));
        /*  this.notyf.open({ type: 'success', message: 'Form submitted successfully!' }); */
        this.saveLink();
        this.fetchForms();

      },
      error: (err: any) => console.error('Error saving form:', err),
    });


  }

  /** Saves the Generated Form Link */
  saveLink() {
    if (this.formLink && !this.isLinkSaved) {
      this.formService.saveFormLink(this._id, this.formLink).subscribe({
        next: (res: any) => {
          this.isLinkSaved = true;
          console.log('Link saved successfully', res.result);
        },
        error: (err: any) => console.error('Error saving link:', err),
      });
    }
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

  /** Prevents Returning Dragged Elements to Sidebar */
  noReturnPredicate() {
    return false;
  }
}