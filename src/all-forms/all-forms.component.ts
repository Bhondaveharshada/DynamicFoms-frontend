import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormsModule } from '@angular/forms';
import { ActivatedRoute,Router, RouterModule } from '@angular/router';
import { FormService } from '../services/form.service';
import { response } from 'express';
import { MatSnackBar } from '@angular/material/snack-bar'
import { CommonModule } from '@angular/common';
import type { BootstrapOptions as bootstrap } from '@angular/core';
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';
declare var bootstrap :any;

@Component({
  selector: 'app-all-forms',
  imports: [CommonModule,FormsModule,RouterModule,],
  templateUrl: './all-forms.component.html',
  styleUrl: './all-forms.component.css'
})
export class AllFormsComponent implements OnInit {
  private notyf = new Notyf({
    duration: 2000, // Default duration for messages
    position: {
      x: 'center', // 'left', 'center', or 'right'
      y: 'top',   // 'top' or 'bottom'
    },
  });
  
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
  

  constructor(private formService: FormService,private router : Router, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.getAllFormFields();
  }

  // Fetch all form fields
  getAllFormFields(): void {
    this.formService.getAllFormFields().subscribe({
      next: (res: any) => {
        console.log('All form fields:', res);
        this.formFields = res.result.reverse();// Assuming result contains the array
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

// Populate form data for editing
editForm(id:any): void {
  this.router.navigate([`/updateform/${id}`])
  this.showForm = true; // Show the form section
  this.isEditing = true; // Set to edit mode
  //this.formIdToEdit = form._id; // Store the form ID being edited

  console.log(this.formIdToEdit);
}

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
        this.notyf.success("form delelted")
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

