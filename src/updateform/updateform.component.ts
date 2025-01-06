import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormService } from '../services/form.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DragDropModule, moveItemInArray,CdkDragDrop } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-updateform',
  imports: [CommonModule,RouterModule,FormsModule,DragDropModule,],
  templateUrl: './updateform.component.html',
  styleUrl: './updateform.component.css'
})
export class UpdateformComponent implements OnInit {

  form_id :any
  formUpdated = false;

  title: string = '';            
  additionalFields: { inputType: string, label: string, required: boolean, options: string[] }[] = [];
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

  constructor(private activatedRoute : ActivatedRoute, private formService: FormService ){}

  ngOnInit(): void {
    this.form_id = this.activatedRoute.snapshot.paramMap.get('id');
    console.log('Form ID:', this.form_id);
    this.fetchFormFieldsDetails()
  }

  fetchFormFieldsDetails(){
    this.formService.getFormFields(this.form_id).subscribe({
      next:(res:any)=>{
        this.title = res.result.title; // Set the form title
        this.additionalFields = res.result.additionalFields.map((field: any) => ({
          inputType: field.inputType,
          label: field.value,
          required: field.isrequired,
          options: field.options || [] // Default to an empty array if options are missing
        }));
       
        
      },error :(err:any)=>{
        console.error("error in fetching formfields",err);
        
      }
        
    })
  }

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

    removeField(index: number) {
      this.additionalFields.splice(index, 1);
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

  noReturnPredicate() {
    return false;
  }


addOption(index: number) {
  this.additionalFields[index].options.push('');
}

// Handle removing an option (for checkbox or radio fields)
removeOption(index: number, optionIndex: number) {
  this.additionalFields[index].options.splice(optionIndex, 1);
}

onUpdate(event: Event): void {
  const updatedForm = {
    title: this.title,
    additionalFields: this.additionalFields.map((field) => ({
      value: field.label,
      inputType: field.inputType,
      isrequired: field.required,
      options: field.options, 
   
    
    })),
  };
  this.formUpdated = true; // Set the flag to true to show the message
  
  // Hide the message after 3 seconds
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
