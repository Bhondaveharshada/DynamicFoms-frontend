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
      // Create FormArray for each form's timepoints
      const timepointControls = this.timepoints.map(() => this.fb.control(false));

      // Create FormGroup for each form
      const formGroup = this.fb.group({
        formId: form._id,
        timepoints: this.fb.array(timepointControls), // FormArray of checkboxes
      });

      relationsArray.push(formGroup);
    });

    console.log("Relation form initialized:", this.relationsForm.value);
  }
}


onSubmit(){
  alert("HELlo")
  console.log(this.relationsForm.value);
  console.log(JSON.stringify(this.relationsForm.value));
}

}
