import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormService } from '../services/form.service';
import { RouterModule } from '@angular/router';
import { environment } from '../environments/environment';
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';

@Component({
  selector: 'app-form',
  imports: [RouterModule,ReactiveFormsModule,CommonModule,FormsModule],
  templateUrl: './form.component.html',
  styleUrl: './form.component.css'
})
export class FormComponent implements OnInit{

  showForm: boolean = false; // Toggle for form visibility
  isEditing: boolean = false; // Toggle for edit mode
  formIdToEdit: string | null = null; // Tracks form being edited
  title: string = '';
  additionalFields: { value: string; inputType: string, isrequired:string, numberOfCheckboxes: number, checkboxOptions: string[],radioButtonOptions:string[] , numberOfRadioButtons:number}[] = [];
  formLink: any = '';
  isLinkSaved = false;
  formFields: any[] = [];
  _id:any
  notyf = new Notyf({
    duration: 4000, // Default duration for all notifications
    ripple: true,   // Enable ripple effect
    dismissible: true, // Allow dismissal
    position: {
      x: 'center', 
      y: 'top',    
    },
    types: [
      {
        type: 'success', 
        background: '#28a745', // Green for success
     
      },
      {
        type: 'error', 
        background: '#dc3545',
      },
    ],
  });
 


  constructor(private formService: FormService) {}


  ngOnInit(): void {
    this.fetchForms();
    this.toggleCreateForm() // Fetch all forms initially
  }

  // Fetch all fonpmrms from the backend
  fetchForms(): void {
    this.formService.getAllFormFields().subscribe({
      next: (res: any) => {
        this.formFields = res.result || [];
        console.log('Fetched forms:', this.formFields);
      },
      error: (err: any) => console.error('Error fetching forms:', err),
    });
  }

  // Add a new dynamic field
  addField(): void {
    this.additionalFields.push({
      value: '',
      inputType: 'text', // Default type is text
      isrequired: 'optional',
      checkboxOptions: [],
      numberOfCheckboxes: 0, 
      radioButtonOptions: [], 
      numberOfRadioButtons: 0, 
    });
  }
  

  // Delete a specific field
  deleteField(index: number): void {
    if (index >= 0 && index < this.additionalFields.length) {
      this.additionalFields.splice(index, 1);
    }
  }

  // Toggle the form for creating/editing
  toggleCreateForm(): void {
    if(this.showForm){
      this.resetForm()
    }else{
      this.showForm = true
    }
    this.isEditing = false; 
   
   
  }

  onInputTypeChange(field: any): void {
    if (field.inputType === 'checkbox') {
      field.numberOfCheckboxes = 0; // Reset number of checkboxes
      field.checkboxOptions = []; // Reset checkbox options
    }
     else if (field.inputType === 'radio') {
      field.numberOfRadioButtons = 0; // Reset number of radio buttons
      field.radioButtonOptions = []; 
    }
      else {
      delete field.numberOfCheckboxes;
      delete field.checkboxOptions;
      delete field.numberOfRadioButtons;
      delete field.radioButtonOptions;
    }
  }

  generateCheckboxOptions(field: any): void {
    if (field.numberOfCheckboxes > 0) {
      // Create an array with the specified number of checkbox options
      field.checkboxOptions = Array(field.numberOfCheckboxes).fill('');
    } else {
      field.checkboxOptions = [];
    }
  }
  
  trackByIndex(index: number, item: any): number {
    return index;
  }
  


generateRadioButtonOptions(field: any): void {
  if (field.numberOfRadioButtons > 0) {
    // Create an array with the specified number of radio button options
    field.radioButtonOptions = Array(field.numberOfRadioButtons).fill('');
  } else {
    field.radioButtonOptions = [];
  }
}
  

  // Populate form data for editing
/*   editForm(form: any): void {
    this.showForm = true; // Show the form section
    this.isEditing = true; // Set to edit mode
    this.formIdToEdit = form._id; // Store the form ID being edited

    console.log(this.formIdToEdit);
    

    // Populate the form fields
    this.title = form.title;
    this.additionalFields = form.additionalFields.map((field: any) => ({
      value: field.value,
      inputType: field.inputType,
    }));

  } */

  // Save or Update form data
  onSave(event: Event): void {
     event.preventDefault(); // Prevent the default form submission behavior
    const formData = {
      title: this.title,
      additionalFields: this.additionalFields.map((field) => ({
        value: field.value,
        inputType: field.inputType,
        isrequired: field.isrequired,
        checkboxOptions: field.checkboxOptions || null, // Include options if available
        radioButtonOptions:field.radioButtonOptions ||null,
      
      })),
    };
  /*
    if (this.isEditing && this.formIdToEdit) {
      // Update existing form
      this.formService.updateFormFields(this.formIdToEdit, formData).subscribe({
        next: (res: any) => {
          console.log('Form updated successfully:', res);
          this.fetchForms();
          this.resetForm();
        },
        error: (err: any) => console.error('Error updating form:', err),
      });
    } else { */
      // Save new form
      const formId = new Date().getTime();
      this.formService.addFormFields(formData, formId).subscribe({
        next: (res: any) => {
          
          const id = res.result._id;
          this._id = id;
          this.formLink = `${window.location.origin}/form/${id}/${formId}`;
          console.log('formlink form onsave fun', typeof this.formLink, this.formLink);
          const stringLink = `${this.formLink}`;
          console.log('String link', String(stringLink));
          this.notyf.open({ type: 'success', message: 'Form submitted successfully!' });
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
  // Reset form fields
  resetForm(): void {
    this.title = '';
    this.additionalFields = [];
    this.formLink = null;
    this.showForm = false;
    this.isEditing = false;
    this.formIdToEdit = null;
  }

  // Delete a form
  deleteForm(id: any) {
    if (confirm('Are you sure you want to delete this form?')) {
      this.formService.deleteFormFields(id).subscribe({
        next: (res:any) => {
          this.fetchForms(); // Refresh the list of forms
        },
        error: (err:any) => console.error('Error deleting form:', err),
      });
    }
}
}