import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule,ActivatedRoute } from '@angular/router';
import { ObjectKeysPipe } from '../pipes/object-keys.pipe';
import { FormService } from '../services/form.service';


@Component({
  selector: 'app-userforms',
  imports: [RouterModule, CommonModule, ObjectKeysPipe],
  templateUrl: './userforms.component.html',
  styleUrl: './userforms.component.css',
  providers:[ObjectKeysPipe]
})
export class UserformsComponent implements OnInit {

  formTitle:any
  mappedFields: any[] = []; 
  constructor(private formservice:FormService, private route:ActivatedRoute, private objectkeys: ObjectKeysPipe){}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    console.log(id);
    this.formservice.fetchUserForms(id).subscribe({
      next: (res: any) => {
        const targetId = res.result;
        const fields = res.Fields; // Form details
        this.formTitle = fields.title; // Extract form title
        console.log('Form Title:', this.formTitle);
    
        const mappedFields: any[] = []; // Array to hold the mapped data
    
        // Loop through all form entries in the result
        for (let item of res.result) {
          const keyValuePairs: Record<string, any> = {}; // Object to hold key-value pairs for this form
    
          // Map additionalFields values
          fields.additionalFields.forEach((field: any, index: number) => {
            const key = field.value; // Field name (key)
            const value = item.additionalFields[index]?.value || 'N/A'; // Field value
            keyValuePairs[key] = value; // Map the key to its value
          });
    
          // Add this form's data to the array
          mappedFields.push({
            formId: item._id,
            keyValuePairs: keyValuePairs,
          });
        }
    
        this.mappedFields = mappedFields; // Store the mapped data in a variable for display
        console.log('Mapped Fields:', this.mappedFields);
      },
      error: (err) => {
        console.log(err);
      },
    });
          
  }

}
