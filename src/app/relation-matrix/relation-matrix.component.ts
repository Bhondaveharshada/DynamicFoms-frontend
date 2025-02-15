import { CommonModule } from '@angular/common';
import { RelationService } from './service/relation.service';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule } from '@angular/forms';
import { FormService } from '../../services/form.service';
import { TimepointService } from '../timepoint/Service/timepoint.service';

@Component({
  selector: 'app-relation-matrix',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './relation-matrix.component.html',
  styleUrls: ['./relation-matrix.component.css'],
})
export class RelationMatrixComponent implements OnInit {
  relationsForm: FormGroup;
  forms: any = []; // Forms fetched from backend
  timepoints: any = []; // Timepoints fetched from backend

  constructor(private fb: FormBuilder, private relationService: RelationService, private formService: FormService, private timepointService: TimepointService) {
    this.relationsForm = this.fb.group({
      relations: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    this.fetchForms();
    this.fetchTimepoints();
  }

  // Fetch forms from backend
  fetchForms() {
    console.log("FETCHING");

    this.formService.getAllFormFields().subscribe(
      (response: any) => {
        this.forms = response.result;
        console.log(this.forms);
        console.log("forms fetched successfully");
      },
      (error) => {
        alert("Error fetching forms");
        console.log(error);
      }
    );
  }

  // Fetch timepoints from backend
  fetchTimepoints() {
    this.timepointService.getTimepoints().subscribe(
      (data: any) => {
        this.timepoints = data;
        console.log("timepoints fetched");
        console.log(data);
        this.initializeForm();
      },
      (error) => {
        alert("error fetching timepoints")
        console.log("error fetching timepoints", error);
      }

    );
  }

  initializeForm() {
    if (this.forms.length && this.timepoints.length) {
      const relationsArray = this.relationsForm.get('relations') as FormArray;

      this.forms.forEach((form: any) => {
        // Create FormGroup for each form
        const formGroup = this.fb.group({
          formId: form._id, // ID of the form
          timepoints: this.fb.array([]), // Empty array to store selected timepoint IDs
        });

        relationsArray.push(formGroup);
      });

      console.log("Relation form initialized:", this.relationsForm.value);
    }
  }

  onCheckboxChange(formIndex: number, timepointId: string, event: Event): void {
    // Cast event.target to HTMLInputElement to access the `checked` property
    const isChecked = (event.target as HTMLInputElement).checked;

    const relationsArray = this.relationsForm.get('relations') as FormArray;
    const formGroup = relationsArray.at(formIndex) as FormGroup;
    const timepointsArray = formGroup.get('timepoints') as FormArray;

    if (isChecked) {
      // Add the timepoint ID if it doesn't exist in the array
      if (!timepointsArray.value.includes(timepointId)) {
        timepointsArray.push(this.fb.control(timepointId));
      }
    } else {
      // Remove the timepoint ID if unchecked
      const index = timepointsArray.value.indexOf(timepointId);
      if (index !== -1) {
        timepointsArray.removeAt(index);
      }
    }

    console.log(`Updated timepoints for form ${formIndex}:`, timepointsArray.value);
  }



  isChecked(formIndex: number, timepointId: string): boolean {
    const relationsArray = this.relationsForm.get('relations') as FormArray;
    const formGroup = relationsArray.at(formIndex) as FormGroup;
    const timepointsArray = formGroup.get('timepoints') as FormArray;

    // Return true if the timepointId exists in the array, false otherwise
    return timepointsArray?.value?.includes(timepointId) || false;
  }


  onSubmit() {
    const processedRelations = this.relationsForm.value.relations.map((relation: any) => ({
      formId: relation.formId,
      timepoints: relation.timepoints, // Already contains only selected IDs
    }));
    alert("data")
    console.log('Processed Relations:', processedRelations);
    this.relationService.saveRelations(processedRelations).subscribe(
      (response) => {
        console.log('Relations saved successfully:', response);
        alert('Relations saved successfully!');
      },
      (error) => {
        console.error('Error saving relations:', error);
        alert('Failed to save relations. Please try again.');
      }
    );
  }


}
