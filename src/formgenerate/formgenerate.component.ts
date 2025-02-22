import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, Validators, FormGroup, FormBuilder, FormArray, FormControl } from '@angular/forms';
import { CommonModule, JsonPipe, Location } from '@angular/common';
import { FormService } from '../services/form.service';
import Swal from 'sweetalert2';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PatientService } from '../app/patient/service/patient-service.service';
import { EmailService } from '../app/Email/email.service';

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
  patientData: any ;

  constructor(private location: Location, private fb: FormBuilder, private route: ActivatedRoute, private formService: FormService, private router: Router, private patientService: PatientService, private emailService : EmailService) {

  }

  async ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.patientId = params['patientId'];
      this.timepointId = params['timepointId'];
      this.formId = params['formId'];
    });

    const id = this.route.snapshot.paramMap.get('id');
    this.formfieldId = id;

    await this.fetchFormFields(id);

    // Check if the form is already filled

    this.fetchPatientData();
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

  async fetchFormFields(id: any) {
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
                value:
                  field.inputType === 'checkbox'
                    ? [Array.isArray(field.value) ? field.value : []] // Ensure value is an array for checkboxes
                    : [field.value || '', this.getDynamicValidators(field)], // Default value for other types
                inputType: [field.inputType, Validators.required],
                isrequired: [field.isrequired],
                options: [Array.isArray(field.options) ? field.options : []], // Ensure options are an array
              })
            )
          ),
        });

        this.checkIfFormFilled().then((isFilled) => {
          if (isFilled) {
            console.log('Form is already filled, populating data...');
          }
        });
      },
      error: (err: any) => {
        console.error("Error fetching fields", err);
      },
    });
  }

  onCheckboxChange(event: Event, fieldIndex: number): void {
    const checkboxArray = this.additionalFields.at(fieldIndex).get('value') as FormControl;
    const value = (event.target as HTMLInputElement).value;

    if ((event.target as HTMLInputElement).checked) {
      // Add the value to the checkbox array
      checkboxArray.setValue([...checkboxArray.value, value]);
    } else {
      // Remove the value from the checkbox array
      checkboxArray.setValue(checkboxArray.value.filter((v: string) => v !== value));
    }
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
    } else {
      switch (field.inputType) {
        case 'email':
          return [Validators.email];
        case 'number':
          return [Validators.pattern(/^[0-9]{10}$/)];
        case 'text':
          return [Validators.minLength(3)];
        case 'password':
          return [Validators.minLength(6)];
        default:
          return []; // Default validator
      }
    }
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
          let payload = {
            id: this.patientId,
            name: this.patientData.name,
            formName: this.formData.title,
            formData: userform
          }
          this.emailService.sendEmail(payload).subscribe(
            {
              next : (res) => {
                Swal.fire({
                  title: 'Success!',
                  text: 'Email sent successfully!',
                  icon: 'success',
                  confirmButtonText: 'OK'
                });
                console.log("Email sent", res);

              },
              error: (err) => {
                console.error("Error sending email", err);
              }
            });
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
      Swal.fire({
        title: 'Error!',
        text: 'Fill Required Fields correctly!',
        icon: 'error',
        confirmButtonText: 'OK'
      });
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
                console.log("filled response : ", response.result);
                console.log("preview form : ", this.previewForm);
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
    if (!this.previewForm || !this.previewForm.controls['additionalFields']) {
      console.error("Preview form is not initialized or additionalFields is missing");
      return;
    }

    const additionalFieldsControl = this.previewForm.get('additionalFields') as FormArray;

    existingData.additionalFields.forEach((existingField: any) => {
      const matchingField = additionalFieldsControl.controls.find((control) => {
        const controlValue = control.value;
        return controlValue.inputType === existingField.inputType && controlValue.label === existingField.label;
      });

      if (matchingField) {
        const fieldFormGroup = matchingField as FormGroup;

        if (existingField.inputType === 'checkbox') {
          // For checkboxes, set the value as an array of selected options
          fieldFormGroup.get('value')?.setValue(existingField.value);
        } else if (existingField.inputType === 'radio') {
          // For radio buttons, set the selected value
          fieldFormGroup.get('value')?.setValue(existingField.value);
        } else {
          // For other input types, set the value directly
          fieldFormGroup.get('value')?.setValue(existingField.value);
        }
      }
    });
    this.previewForm.disable();
    this.editModeFlag = false;
    this.prePopulatedFlag = true;
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


  saveAsPDF() {
    const printContent = document.querySelector('.form-preview') as HTMLElement;

    if (!printContent) {
      console.error('Form preview container not found.');
      return;
    }

    // Clone the form content to modify it without affecting the original
    const clonedContent = printContent.cloneNode(true) as HTMLElement;

    // Remove unwanted buttons (update, edit, print, etc.)
    const buttons = clonedContent.querySelectorAll('button');
    buttons.forEach((button) => button.remove());

    // Temporarily remove placeholders from inputs and textareas
    const inputs = clonedContent.querySelectorAll('input, textarea');
    const placeholders: string[] = [];
    inputs.forEach((input, index) => {
      placeholders[index] = input.getAttribute('placeholder') || ''; // Save current placeholder
      input.removeAttribute('placeholder'); // Remove placeholder
    });

    // Append the cloned content to the body temporarily (hidden)
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.zIndex = '-1';
    container.appendChild(clonedContent);
    document.body.appendChild(container);

    // Use html2canvas to capture the modified content
    html2canvas(clonedContent, {
      scale: 2, // Increase resolution for better clarity
      useCORS: true, // Handle cross-origin images
      width: clonedContent.scrollWidth, // Full width of the content
      height: clonedContent.scrollHeight, // Full height of the content
    })
      .then((canvas) => {
        // Convert the canvas to an image
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4'); // Create PDF in portrait mode

        // Calculate dimensions to fit the content on an A4 page
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        // Add the image to the PDF
        let yOffset = 0;
        while (yOffset < pdfHeight) {
          pdf.addImage(
            imgData,
            'PNG',
            0,
            -yOffset,
            pdfWidth,
            Math.min(pdfHeight - yOffset, pdf.internal.pageSize.getHeight())
          );
          yOffset += pdf.internal.pageSize.getHeight();
          if (yOffset < pdfHeight) pdf.addPage();
        }

        // Save the PDF
        if(this.patientData){
          pdf.save(this.patientData.id+"_"+this.patientData.name+"_"+this.formData.title+'.pdf');
        } else {
          pdf.save(this.formData.title+'.pdf');
        }
      })
      .catch((error) => {
        console.error('Error capturing the form:', error);
      })
      .finally(() => {
        // Restore placeholders
        inputs.forEach((input, index) => {
          if (placeholders[index]) {
            input.setAttribute('placeholder', placeholders[index]);
          }
        });

        // Remove the temporary container
        document.body.removeChild(container);
      });
  }

  fetchPatientData(){
    if(this.patientId){
      this.patientService.getPatientById(this.patientId).subscribe({
        next: (response) => {
          console.log("patinent data : ", response);
          this.patientData = response;
        }
      });
    }
  }

}



