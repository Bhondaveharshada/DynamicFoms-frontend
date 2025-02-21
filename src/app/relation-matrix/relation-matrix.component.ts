import { CommonModule } from '@angular/common';
import { RelationService } from './service/relation.service';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule } from '@angular/forms';
import { FormService } from '../../services/form.service';
import { TimepointService } from '../timepoint/Service/timepoint.service';
import Swal from 'sweetalert2'; // Import SweetAlert
import { Router } from '@angular/router';
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
  existingRelations: any = []; // Existing relations fetched from backend

  constructor(
    private fb: FormBuilder,
    private relationService: RelationService,
    private formService: FormService,
    private timepointService: TimepointService,
    private router: Router
  ) {
    this.relationsForm = this.fb.group({
      relations: this.fb.array([]),
    });
  }

  async ngOnInit() {
    Swal.fire({
      title: 'Loading...',
      text: 'Please wait while data is being loaded.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    console.log("Starting data fetch...");

    try {
      // Execute functions one after another
      await this.fetchForms();
      console.log("Forms fetched successfully.");

      // Initialize form only after all functions have completed

      console.log("Form initialized:", this.relationsForm.value);

    } catch (error) {
      console.error("Error fetching data:", error);
      Swal.fire('Error', 'Failed to load data.', 'error');
      return;
    }

    Swal.close(); // Close loader after everything is done
    console.log("Loader closed.");
  }

  // Fetch forms from backend
  async fetchForms() {
    this.formService.getAllFormFields().subscribe(
      (response: any) => {
        this.forms = response.result;
        console.log('Forms fetched successfully:', this.forms);
        this.fetchTimepoints();
        console.log("Timepoints fetched successfully.");
      },
      (error) => {
        console.error(error);
      }
    );
  }

  // Fetch timepoints from backend
  async fetchTimepoints() {
    this.timepointService.getTimepoints().subscribe(
      (data: any) => {
        this.timepoints = data;
        console.log('Timepoints fetched successfully:', this.timepoints);
        this.fetchRelations();
        console.log("Relations fetched successfully.");
      },
      (error) => {
        console.error(error);
      }
    );
  }

  // Fetch existing relations from backend
  async fetchRelations() {
    this.relationService.getAllRelations().subscribe(
      (response: any) => {
        this.existingRelations = response.data || [];
        console.log('Existing relations fetched successfully:', this.existingRelations);
        this.initializeForm();
      },
      (error) => {
        console.error(error);
      }
    );
  }

  initializeForm() {

      const relationsArray = this.relationsForm.get('relations') as FormArray;
      relationsArray.clear(); // Clear any existing form controls

      this.forms.forEach((form: any) => {
        // Check if a relation exists for the current form
        const existingRelation = this.existingRelations.find((rel: any) => rel.formId === form._id);

        // Create FormGroup for the form
        const formGroup = this.fb.group({
          formId: form._id, // ID of the form
          timepoints: this.fb.array(existingRelation ? existingRelation.timepoints : []), // Pre-populate with existing timepoints or initialize empty
        });

        relationsArray.push(formGroup);
      });

      console.log('Relation form initialized:', this.relationsForm.value);
  }

  onCheckboxChange(formIndex: number, timepointId: string, event: Event): void {
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
    if (!relationsArray || !relationsArray.at(formIndex)) {
      return false; // Return false if relationsArray or formGroup is undefined
    }

    const formGroup = relationsArray.at(formIndex) as FormGroup;
    const timepointsArray = formGroup.get('timepoints') as FormArray;

    return timepointsArray?.value?.includes(timepointId) || false;
  }


  onSubmit() {
    const processedRelations = this.relationsForm.value.relations.map((relation: any) => ({
      formId: relation.formId,
      timepoints: relation.timepoints, // Already contains only selected IDs
    }));
    console.log('Processed Relations:', processedRelations);

    this.relationService.saveRelations(processedRelations).subscribe(
      (response) => {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Relations saved successfully!',
          confirmButtonText: 'OK',
        });
        console.log('Relations saved successfully:', response);
      },
      (error) => {
        console.error('Error saving relations:', error);
      }
    );
  }

  back(){
    this.router.navigate([`/`]);
  }
}
