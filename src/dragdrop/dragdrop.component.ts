import { Component } from '@angular/core';
import {CdkDragDrop,moveItemInArray, DragDropModule } from '@angular/cdk/drag-drop';
import { RouterModule } from '@angular/router';
import { CommonModule, formatCurrency } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormService } from '../services/form.service';

@Component({
  selector: 'app-dragdrop',
  imports: [RouterModule,DragDropModule,CommonModule,FormsModule],
  templateUrl: './dragdrop.component.html',
  styleUrl: './dragdrop.component.css'
})
export class DragdropComponent {
 
  constructor(private formService : FormService){}

  title: string = ''
  all = [
    'text',
    'number',
    'label',
    'email',
    'password',
    'date',
    'checkbox',
    'radio'
  ];
  formLink: any = '';
  formFields: any[] = [];
  _id:any
  isLinkSaved = false;
  additionalFields: { inputType: string, label: string, required: boolean, options: string[] }[] = [];

  // Handle dropping the fields into the form
  drop(event: CdkDragDrop<any[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Add the selected field inputType to the additionalFields array with default values
      this.additionalFields.push({ inputType: event.item.data, label: '', required: false, options: [] });
    }
  }
 
  
  addField(): void {
    this.additionalFields.push({
      label: '',
      inputType: 'text',
      required: false,
      options: [],
  
    });
  }
   

  trackByIndex(index: number, item: any): number {
    return index;
  }

  // Handle changing the field inputType
  onFieldTypeChange(index: number, newType: string) {
    this.additionalFields[index].inputType = newType;
  }

  // Handle changing the label for a field
  onLabelChange(index: number, newLabel: string) {
    this.additionalFields[index].label = newLabel;
  }

  // Handle changing the "required" checkbox
  onRequiredChange(index: number, isRequired: boolean) {
    this.additionalFields[index].required = isRequired;
  }

  // Handle adding an option (for checkbox or radio fields)
  addOption(index: number) {
    this.additionalFields[index].options.push('');
  }

  // Handle removing an option (for checkbox or radio fields)
  removeOption(index: number, optionIndex: number) {
    this.additionalFields[index].options.splice(optionIndex, 1);
  }

  // Handle removing a field
  removeField(index: number) {
    this.additionalFields.splice(index, 1);
  }

  noReturnPredicate() {
    return false;
  }

  fetchForms(): void {
    this.formService.getAllFormFields().subscribe({
      next: (res: any) => {
        this.formFields = res.result || [];
        console.log('Fetched forms:', this.formFields);
      },
      error: (err: any) => console.error('Error fetching forms:', err),
    });
  }

  onSave(event: Event): void {
    event.preventDefault(); // Prevent the default form submission behavior
   const formData = {
     title: this.title,
     additionalFields: this.additionalFields.map((field) => ({
       value: field.label,
       inputType: field.inputType,
       isrequired: field.required,
       options: field.options || null,
     
     })),
   };

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

  
 saveLink(){
   if (this.formLink) {
     if (this.isLinkSaved) return; 
     
     this.formService.saveFormLink(this._id, this.formLink ).subscribe({
       next: (res:any) => {
         this.isLinkSaved = true;
         console.log('Link saved successfully',res.result);
       },
       error: (err: any) => console.error('Error saving link:', err),
     });
   }
 }

 resetForm(): void {
   this.title = '';
   this.additionalFields = [];
   this.formLink = null;
 
 }
}
