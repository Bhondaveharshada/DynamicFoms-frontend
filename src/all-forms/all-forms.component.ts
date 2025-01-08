import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormsModule } from '@angular/forms';
import { ActivatedRoute,Router, RouterModule } from '@angular/router';
import { FormService } from '../services/form.service';
import { response } from 'express';
import { CommonModule } from '@angular/common';
import type { BootstrapOptions as bootstrap } from '@angular/core';
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';
declare var bootstrap :any;

@Component({
  selector: 'app-all-forms',
  imports: [CommonModule,FormsModule,RouterModule],
  templateUrl: './all-forms.component.html',
  styleUrl: './all-forms.component.css'
})
export class AllFormsComponent implements OnInit {

  formFields: any[] = []; 
  selectedFormId: string | null = null; 
  showForm: boolean = false; 
  isEditing: boolean = false; 
  formIdToEdit: string | null = null; 
  title: string = '';
  additionalFields: { value: string; inputType: string,isrequired:string, numberOfCheckboxes: number, checkboxOptions: string[],radioButtonOptions:string[] , numberOfRadioButtons:number  }[] = [];
  formLink: any = '';
  isLinkSaved = false;
  _id:any 

  constructor(private formService: FormService,private router : Router) {}

  ngOnInit(): void {
    this.getAllFormFields();
  }

  // Fetch all form fields
  getAllFormFields(): void {
    this.formService.getAllFormFields().subscribe({
      next: (res: any) => {
        console.log('All form fields:', res);
        this.formFields = res.result;// Assuming result contains the array
      },
      error: (err: any) => {
        console.error('Error in fetching form fields', err);
      }
    });
  }
  selectedForm: any = null;

  openModal(form: any): void {
    this.selectedForm = form;
    console.log("form",this.selectedForm);
    
    const modalElement = document.getElementById('formDetailsModal');

    if (modalElement) {
      const bootstrapModal = new bootstrap.Modal(modalElement);
      bootstrapModal.show();
    }
  }
  stopEvent(event: Event): void {
    event.stopPropagation();
  }


  

  // Toggle the display of additional fields
  toggleDetails(formId: string): void {
    this.selectedFormId = this.selectedFormId === formId ? null : formId;
  }

 // Add a new dynamic field
 addField(): void {
  this.additionalFields.push({  value: '',
    inputType: 'text', // Default type is text
    isrequired: 'optional',
    checkboxOptions: [],
    numberOfCheckboxes: 0,
    radioButtonOptions: [], 
    numberOfRadioButtons:0,
  });
}


deleteField(index: number): void {
  if (index >= 0 && index < this.additionalFields.length) {
    this.additionalFields.splice(index, 1);
  }
}


toggleCreateForm(): void {
  if(this.showForm){
    this.resetForm()
  }else{
    this.showForm = true
  }
  this.isEditing = false; 
 
 
}

addOption(field: any): void {
  field.radioButtonOptions.push('');
}

removeOption(field: any, index: number): void {
  field.radioButtonOptions.splice(index, 1);
}

generateRadioButtonOptions(field: any): void {
  const currentLength = field.radioButtonOptions?.length || 0;
  const newLength = field.numberOfRadioButtons;

  if (!field.radioButtonOptions) {
    field.radioButtonOptions = [];
  }

  if (newLength > currentLength) {
    // Add new options to the array
    for (let i = currentLength; i < newLength; i++) {
      field.radioButtonOptions.push('');
    }
  } else if (newLength < currentLength) {
    // Remove excess options from the array
    field.radioButtonOptions.splice(newLength);
  }
}

// Populate form data for editing
editForm(id:any): void {
  this.router.navigate([`/updateform/${id}`])
  this.showForm = true; // Show the form section
  this.isEditing = true; // Set to edit mode
  //this.formIdToEdit = form._id; // Store the form ID being edited

  console.log(this.formIdToEdit);
  

  // Populate the form fields
 /*  this.title = form.title;
  this.additionalFields = form.additionalFields.map((field: any) => ({
    value: field.value,
    inputType: field.inputType,
    isrequired:field.isrequired,
    checkboxOptions:field.checkboxOptions,
    numberOfCheckboxes: field.numberOfCheckboxes, 
    radioButtonOptions:field.radioButtonOptions, 
    numberOfRadioButtons: field.numberOfRadioButtons, 
  })); */

}

// Save or Update form data
/* onSave(event: Event): void {
  event.preventDefault(); // Prevent the default form submission behavior

  const formId = new Date().getTime();
  const formData = {
    title: this.title,
    additionalFields: this.additionalFields.map((field) => ({
      value: field.value,
      inputType: field.inputType,
      isrequired: field.isrequired,
      checkboxOptions: field.checkboxOptions, // Include options if available
      radioButtonOptions:field.radioButtonOptions,
    
    })),
  };

  if (this.isEditing && this.formIdToEdit) {
    // Update existing form
    this.formService.updateFormFields(this.formIdToEdit, formData).subscribe({
      next: (res: any) => {
        console.log('Form updated successfully:', res);
        this.getAllFormFields();
        this.resetForm();
      },
      error: (err: any) => console.error('Error updating form:', err),
    });
  } else {
    // Save new form
    const formId = new Date().getTime();
    this.formService.addFormFields(formData, formId).subscribe({
      next: (res: any) => {
        console.log('Form saved successfully:', res);
        const id = res.result._id;
        this._id = id;
        this.formLink = `${window.location.origin}/form/${id}/${formId}`;
        console.log('formlink form onsave fun', typeof this.formLink, this.formLink);
        const stringLink = `${this.formLink}`;
        console.log('String link', String(stringLink));
        
        this.getAllFormFields();
      },
      error: (err: any) => console.error('Error saving form:', err),
    });
  }
}

removeCheckboxOption(field: any, index: number): void {
  if (index >= 0 && index < field.checkboxOptions.length) {
    field.checkboxOptions.splice(index, 1); // Remove the option
  }
}

// Method to add a new checkbox option
addCheckboxOption(field: any): void {
  if (!field.checkboxOptions) {
    field.checkboxOptions = []; // Initialize array if not defined
  }
  field.checkboxOptions.push(''); // Add a new empty option
}


removeRadioOption(field: any, index: number): void {
  if (index >= 0 && index < field.radioButtonOptions.length) {
    field.radioButtonOptions.splice(index, 1); 
  }
}


addRadioOption(field: any): void {
  if (!field.radioButtonOptions) {
    field.radioButtonOptions = []; 
  }
  field.radioButtonOptions.push(''); 
}
 */

trackByIndex(index: number): number {
  return index; // Use the index as the unique identifier
}
onCancel(): void {
  this.resetForm();
}

deleteForm(id:any){
  if (confirm('Are you sure you want to delete this form?')) {
    this.formService.deleteFormFields(id).subscribe({
      next: (res:any) => {
        this.getAllFormFields(); // Refresh the list of forms
      },
      error: (err:any) => console.error('Error deleting form:', err),
    });
  }
}

ViewUserForms(id:any){
  this.router.navigate([`/userFormsDetails/${id}`]);
}


resetForm():void {
  this.title = '';
this.additionalFields = [];
this.formLink = null;
this.showForm = false;
this.isEditing = false;
this.formIdToEdit = null;
}
  
}

