import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, Validators, FormGroup, FormBuilder, FormArray } from '@angular/forms';
import { CommonModule, JsonPipe, Location } from '@angular/common';
import { FormService } from '../services/form.service';
import Swal from 'sweetalert2';

interface Field {
  options?: string[]; // Unified for both checkboxes and radio buttons
  inputType: string;
  isrequired: string;
  label: string;
  _id: string;
}

@Component({
  selector: 'app-formgenerate',
  imports: [RouterModule, ReactiveFormsModule, CommonModule],
  templateUrl: './formgenerate.component.html',
  styleUrl: './formgenerate.component.css'
})
export class FormgenerateComponent {
  previewForm: FormGroup | null = null;


  // Replace with the ObjectId you want to fetch

  userFormData: any;
  formData: any = null; // Static title and question
  fields: Field[] = [];
  formfieldId: any;
  isPreviewMode = false;
  patientId: string | null = null;
  timepointId: string | null = null;
  formId: string | null = null;
  title = "";
  prePopulatedFlag = false;
  editModeFlag = false;

  constructor(private location: Location, private fb: FormBuilder, private route: ActivatedRoute, private formService: FormService, private router: Router) {

  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.patientId = params['patientId'];
      this.timepointId = params['timepointId'];
      this.formId = params['formId'];
    });

    const id = this.route.snapshot.paramMap.get('id');
    this.formfieldId = id;

    // Check if the form is already filled
    this.checkIfFormFilled().then((isFilled) => {
      if (isFilled) {
        console.log('Form is already filled, populating data...');
      } else {
        console.log('Form is not filled, fetching empty form fields...');
        this.fetchFormFields(id);
      }
    });

    // Listen for changes in additionalFields to apply validators
    this.previewForm?.get('additionalFields')?.valueChanges.subscribe((fields: any[]) => {
      fields.forEach((field, index) => {
        const fieldControl = (this.previewForm?.get('additionalFields') as FormArray).at(index) as FormGroup;

        if (field.isrequired === true) {
          fieldControl.get('value')?.setValidators(this.getValidators(field.inputType));
        } else {
          fieldControl.get('value')?.clearValidators();
        }
        fieldControl.get('value')?.updateValueAndValidity(); // Recalculate validations
      });
    });
  }

  fetchFormFields(id: any): void {
    this.formService.getFormFields(id).subscribe({
      next: (response: any) => {
        this.formData = response.result;

        // Use the unified 'options' field for both checkbox and radio inputs
        this.fields = response.result.additionalFields.map((field: any) => field);

        console.log("Fields from backend:", this.fields);
        this.previewForm = this.fb.group({
          title: [this.formData.title, Validators.required],
          additionalFields: this.fb.array(
            this.formData.additionalFields.map((field: any) =>
              this.fb.group({
                label: [field.label, Validators.required],
                value: field.inputType === 'checkbox' ? [[]] : ['', this.getDynamicValidators(field)],
                inputType: [field.inputType, Validators.required],
                isrequired: [field.isrequired],
                options: [Array.isArray(field.options) ? field.options : []],
              })
            )
          ),
        });
      },
      error: (err: any) => {
        console.error("Error fetching fields", err);
      },
    });
  }

  onCheckboxChange(event: any, fieldIndex: number): void {
    const fieldControl = this.additionalFields.at(fieldIndex).get('value');
    const selectedValues = fieldControl?.value || [];

    if (event.target.checked) {
      // Add selected option
      selectedValues.push(event.target.value);
    } else {
      // Remove unselected option
      const index = selectedValues.indexOf(event.target.value);
      if (index !== -1) {
        selectedValues.splice(index, 1);
      }
    }

    // Update FormControl value
    fieldControl?.setValue(selectedValues);
    fieldControl?.updateValueAndValidity();
  }



  getValidators(inputType: string) {
    switch (inputType) {
      case 'email':
        return [Validators.required, Validators.email];
      case 'number':
        return [Validators.required, Validators.pattern(/^[0-9]{10}$/)];
      case 'text':
        return [Validators.required, Validators.minLength(3)];
      case 'password':
        return [Validators.required, Validators.minLength(6)];
      case 'checkbox':
        return [Validators.requiredTrue]; // Ensures checkbox is checked
      case 'radio':
        return [Validators.required];
      default:
        return [Validators.required]; // Default validator
    }
  }
  getDynamicValidators(field: any) {
    if (field.isrequired) {
      return this.getValidators(field.inputType); // Apply validators if 'required'
    }
    return []; // No validators if 'optional'
  }

  // Getter for additional fields
  get additionalFields(): FormArray {
    return this.previewForm?.get('additionalFields') as FormArray;
  }

  onSubmit() {
    if (this.previewForm?.valid) {
      const formData = {
        ...this.previewForm.value,
        patientId: this.patientId,
        timepointId: this.timepointId,
        formId: this.route.snapshot.queryParams['formId']
      };

      this.formService.addform(formData, this.formfieldId).subscribe({
        next: (res: any) => {
          const fields = this.fields;
          const userform = res.result.additionalFields
          const Toast = Swal.mixin({
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true,
            didOpen: (toast) => {
              toast.onmouseenter = Swal.stopTimer;
              toast.onmouseleave = Swal.resumeTimer;
            }
          });
          Toast.fire({
            icon: "success",
            title: "Form Submitted successfully"
          }).then(() => {
            this.isPreviewMode = true
          })
          const id = res.result._id
          console.log("Id", id);
          console.log("additionalfields from db", userform);
          this.userFormData = this.processSubmittedData(fields, userform);

        }, error: (err: any) => {
          console.log("errrorrr");
        }
      });
      console.log("Submitted Form Data:", this.previewForm.value);
    } else {

      console.log("Form is invalid");
    }
  }

  onBack() {
    this.route.queryParams.subscribe((params) => {
      this.patientId = params['patientId'];
    });
    this.router.navigate(['/patient/datematrix'], { queryParams: { id: this.patientId } });
  }



  processSubmittedData(fields: any[], additionalFields: any[]): any[] {
    return fields.map((field: any, index: number) => ({
      label: field.label || "Unknown Field",
      value: additionalFields[index]?.value || "No Value"
    }));
  }

  checkIfFormFilled(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.patientId && this.timepointId && this.formId) {
        this.formService
          .getSubmittedForm(this.patientId, this.timepointId, this.formId)
          .subscribe({
            next: (response: any) => {
              if (response && response.result) {
                // If form data exists, populate the form
                this.populateFormWithExistingData(response.result);
                resolve(true);
              } else {
                resolve(false);
              }
            },
            error: (err) => {
              console.error('Error checking if form is filled:', err);
              resolve(false);
            },
          });
      } else {
        resolve(false);
      }
    });
  }

  populateFormWithExistingData(existingData: any): void {
    console.log("existing data: ", existingData);
    this.prePopulatedFlag = true;
    console.log("this.prePopulatedFlag : ", this.prePopulatedFlag);

    this.fields = existingData.additionalFields.map((field: any) => field);
    this.title = existingData.title;
    this.previewForm = this.fb.group({
      title: [
        { value: existingData.title, disabled: true },
        Validators.required,
      ],
      additionalFields: this.fb.array(
        existingData.additionalFields.map((field: any) =>
          this.fb.group({
            label: [{ value: field.label, disabled: true }, Validators.required],
            value: [
              { value: field.value || '', disabled: true },
              this.getDynamicValidators(field),
            ],
            inputType: [
              { value: field.inputType, disabled: true },
              Validators.required,
            ],
            isrequired: [{ value: field.isrequired, disabled: true }],
            options: [
              {
                value: Array.isArray(field.options) ? field.options : [],
                disabled: true,
              },
            ],
          })
        )
      ),
    });
    this.previewForm.disable();
    console.log('Populated form with existing data:', existingData);
  }

  // Add a method to enable editing
  enableEditing(): void {
    if (this.previewForm) {
      this.previewForm.enable();
    }
  }

  navigateBack() {
    this.location.back();
  }

  toggleEditMode() {
    if (this.editModeFlag) {
      this.editModeFlag = false;
    } else {
      this.editModeFlag = true;
      this.previewForm?.enable();
    }
  }

  updateFormResponse() {
    console.log("update");
    if (this.previewForm?.valid) {
      const formData = {
        ...this.previewForm.value,
        patientId: this.patientId,
        timepointId: this.timepointId,
        formId: this.route.snapshot.queryParams['formId']
      };
      console.log("Payload : ", formData);
      this.formService.updateSubmittedResponse(formData).subscribe({
        next: (res) => {
          console.log(res);
          const Toast = Swal.mixin({
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true,
            didOpen: (toast) => {
              toast.onmouseenter = Swal.stopTimer;
              toast.onmouseleave = Swal.resumeTimer;
            }
          });
          Toast.fire({
            icon: "success",
            title: "Response Update successfully"
          }).then(() => {
            this.editModeFlag = false;
            this.previewForm?.disable();
          })
        },
        error: (err) => {
          console.log("Error updating form response: ", err);
          const Toast = Swal.mixin({
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true,
            didOpen: (toast) => {
              toast.onmouseenter = Swal.stopTimer;
              toast.onmouseleave = Swal.resumeTimer;
            }
          });
          Toast.fire({
            icon: "error",
            title: err.error.message
          }).then(() => {
            this.editModeFlag = false;
            this.previewForm?.disable();
          })
        }
      });
    }
  }
}



