import { Component, HostListener } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, Validators, FormGroup, FormBuilder, FormArray, FormControl, AbstractControl } from '@angular/forms';
import { CommonModule, JsonPipe, Location } from '@angular/common';
import { FormService } from '../services/form.service';
import Swal from 'sweetalert2';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PatientService } from '../app/patient/service/patient-service.service';
import { EmailService } from '../app/Email/email.service';

interface Field {
  id: string;
  label: string;
  value: string;
  inputType: string;
  isrequired: boolean;
  options?: string[];
  allowMultipleSelection?: boolean;
  isOpen?: boolean;
  validateNumber?: boolean;
  numberValidation?: string;
  softValidation?: boolean;
  validationWarning?: string | null;
  hasVisibilityCondition: boolean;
  visibilityCondition: string | null;
}


@Component({
  selector: 'app-formgenerate',
  imports: [RouterModule, ReactiveFormsModule, CommonModule],
  templateUrl: './formgenerate.component.html',
  styleUrl: './formgenerate.component.css'
})
export class FormgenerateComponent {
  previewForm: FormGroup | null = null;

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
  patientData: any;
  Array = Array;

  constructor(private location: Location, private fb: FormBuilder, private route: ActivatedRoute, private formService: FormService, private router: Router, private patientService: PatientService, private emailService: EmailService) {

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

    this.fetchPatientData();


  // Add this block to listen for form value changes and re-evaluate visibility conditions
  if (this.previewForm) {
    this.previewForm.valueChanges.subscribe(() => {
      this.evaluateVisibilityConditions();
    });
  }

    // Listen for changes in additionalFields to apply validators
    this.previewForm?.get('additionalFields')?.valueChanges.subscribe((fields: any[]) => {
      fields.forEach((field, index) => {
        const fieldControl = (this.previewForm?.get('additionalFields') as FormArray).at(index) as FormGroup;

        if (field.isrequired === true) {
          fieldControl.get('value')?.setValidators(this.getValidators(field.inputType));
        } else {
          fieldControl.get('value')?.clearValidators();
        }
        fieldControl.get('value')?.updateValueAndValidity();
      });
    });
  }
  async fetchFormFields(id: any) {
    this.formService.getFormFields(id).subscribe({
      next: (response: any) => {
        this.formData = response.result;
        console.log("this.formData : ", this.formData);

        this.fields = response.result.additionalFields.map((field: any) => field);
        this.previewForm = this.fb.group({
          title: [this.formData.title, Validators.required],
          additionalFields: this.fb.array(
            this.formData.additionalFields.map((row: any) => {
              const fieldsArray = this.fb.array(
                row.fields.map((field: any) => {
                  const dynamicValidators = this.getDynamicValidators(field);
                  const control = new FormControl(
                    field.value || '',
                    dynamicValidators.length > 0 ? Validators.compose(dynamicValidators) : null
                  );

                  if (field.inputType === 'number' && field.validateNumber && field.softValidation) {
                    const [beforeDecimalPart, afterDecimalPart] = field.numberValidation.split('.');
                    const beforeDecimal = beforeDecimalPart.length; // Max allowed digits before decimal
                    const afterDecimal = afterDecimalPart ? afterDecimalPart.length : 0; // Exact required decimal places

                    const regexPattern = new RegExp(`^\\d{1,${beforeDecimal}}\\.\\d{${afterDecimal}}$`);

                    control.valueChanges.subscribe(value => {
                      const fieldGroup = control.parent;
                      if (fieldGroup) {
                        if (value && !regexPattern.test(value)) {
                          fieldGroup.get('validationWarning')?.setValue(`⚠ Value does not match expected format: ${field.numberValidation}`, { emitEvent: false });
                        } else {
                          fieldGroup.get('validationWarning')?.setValue(null, { emitEvent: false });
                        }
                      }
                    });
                  }

                  const fieldGroup = this.fb.group({
                    id: [field.id || this.generateUniqueId(), Validators.required],
                    label: [field.label, Validators.required],
                    value: control,
                    inputType: [field.inputType, Validators.required],
                    isrequired: [field.isrequired],
                    options: [Array.isArray(field.options) ? field.options : []],
                    allowMultipleSelection: [field.allowMultipleSelection === true],
                    isOpen: [false],
                    validateNumber: field.validateNumber,
                    numberValidation: field.numberValidation,
                    softValidation: field.softValidation,
                    validationWarning: [null],
                    hasVisibilityCondition: [field.hasVisibilityCondition || false],
                    visibilityCondition: [field.visibilityCondition || null],
                    isVisible: [true], // Default visibility to true
                    dateValidation: [field.dateValidation || false],
                    dateFieldType: [field.dateFieldType || null]
                  });

                  return fieldGroup;
                })
              );

              this.assignDateFieldTypes(fieldsArray); // Assign Start/End validation

              return this.fb.group({ fields: fieldsArray });
            })
          ),
        });

        // Evaluate visibility conditions after form initialization
        this.evaluateVisibilityConditions();

        // Listen for changes in additionalFields to apply validators and re-evaluate visibility
        this.previewForm?.get('additionalFields')?.valueChanges.subscribe(() => {
          this.evaluateVisibilityConditions();
        });

        this.previewForm.updateValueAndValidity();
        console.log("Form Errors 0:", this.previewForm.get('additionalFields.0.fields.0.value')?.errors);
        console.log("preview forms 0 : ", this.previewForm.valid, this.previewForm.value);
      },
      error: (err: any) => {
        console.error("Error fetching fields", err);
      },
    });
}

isRowVisible(rowIndex: number): boolean {
  const row = this.getFields(rowIndex).controls;
  return row.some(field => field.value.isVisible);  // At least one field is visible
}


  assignDateFieldTypes(fieldsArray: FormArray) {
    const dateFields = fieldsArray.controls
      .filter((control: any) => control.value.inputType === 'date' && control.value.dateValidation);

    if (dateFields.length === 2) {
      dateFields[0].get('dateFieldType')?.setValue('start');
      dateFields[1].get('dateFieldType')?.setValue('end');

      // Apply validation
      this.applyDateValidation(dateFields[0], dateFields[1]);
    }
  }


  applyDateValidation(startField: AbstractControl, endField: AbstractControl) {
    startField.get('value')?.valueChanges.subscribe(startDate => {
      const endDate = endField.get('value')?.value;

      if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        startField.get('value')?.setErrors({ invalidStartDate: '⚠ Start date is greater than end date' });
      } else {
        startField.get('value')?.setErrors(null); // Clear the error
      }
    });

    endField.get('value')?.valueChanges.subscribe(endDate => {
      const startDate = startField.get('value')?.value;

      if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
        endField.get('value')?.setErrors({ invalidEndDate: '⚠ End date less than start date' });
      } else {
        endField.get('value')?.setErrors(null); // Clear the error
      }
    });
  }




  evaluateVisibilityConditions() {
    if (!this.previewForm) return;

    const formValues = this.previewForm.value;

    this.additionalFields.controls.forEach((row, rowIndex) => {
      const fields = row.get('fields') as FormArray;
      fields.controls.forEach((field, fieldIndex) => {
        const fieldGroup = field as FormGroup;
        const visibilityCondition = fieldGroup.get('visibilityCondition')?.value;

        if (visibilityCondition) {
          const isVisible = this.evaluateVisibilityCondition(fieldGroup, formValues);
          console.log(`Field ${fieldGroup.get('label')?.value} visibility: ${isVisible}`); // Debugging
          fieldGroup.get('isVisible')?.setValue(isVisible, { emitEvent: false });
        } else {
          fieldGroup.get('isVisible')?.setValue(true, { emitEvent: false });
        }
      });
    });
  }

  evaluateVisibilityCondition(field: FormGroup, formValues: any): boolean {
    const visibilityCondition = field.get('visibilityCondition')?.value;

    if (!visibilityCondition) {
      console.log(`No visibility condition for field: ${field.get('label')?.value}`);
      return true; // No condition means the field is always visible
    }

    console.log(`Evaluating visibility condition for field: ${field.get('label')?.value}`);
    console.log(`Condition: ${visibilityCondition}`);

    try {
      const context: { [key: string]: any } = {};

      // Extract all field references (text within single quotes)
      const fieldReferences: string[] = visibilityCondition.match(/'([^']+)'/g) || [];
      const uniqueFieldReferences = [...new Set(fieldReferences)]; // Avoid duplicates

      console.log(`Field references: ${uniqueFieldReferences}`);

      // For each referenced field, set up the corresponding value in the context
      for (const ref of uniqueFieldReferences) {
        const fieldName = ref.replace(/'/g, '');

        if (!this.checkIfFieldExists(fieldName)) {
          console.log(`Field "${fieldName}" does not exist, treated as literal.`);
          continue; // Skip replacement for literals
        }

        // Find the field value
        let fieldValue = null;
        this.additionalFields.controls.forEach((row, rowIndex) => {
          const fields = row.get('fields') as FormArray;
          fields.controls.forEach((fieldControl, fieldIndex) => {
            const fieldGroup = fieldControl as FormGroup;
            if (fieldGroup.get('label')?.value === fieldName) {
              fieldValue = fieldGroup.get('value')?.value;

              // Handle array values for checkboxes or multi-select fields
              if (Array.isArray(fieldValue)) {
                // Keep the value as an array for evaluation
                context[fieldName] = fieldValue;
              } else {
                context[fieldName] = fieldValue;
              }
            }
          });
        });

        console.log(`Field "${fieldName}" value:`, fieldValue);
      }

      console.log(`Context for evaluation:`, context);

      // Replace field references in the condition with their values
      let parsedCondition = visibilityCondition;
      for (const ref of uniqueFieldReferences) {
        const fieldName = ref.replace(/'/g, '');
        if (this.checkIfFieldExists(fieldName)) {
          const fieldValue = context[fieldName];

          // Handle array values
          if (Array.isArray(fieldValue)) {
            // Replace the field reference with a check for any matching value
            parsedCondition = parsedCondition.replace(
              new RegExp(`'${fieldName}'`, 'g'),
              `(${fieldValue.map(val => `'${val}'`).join(' || ')})`
            );
          } else {
            // Replace with the field value (non-array)
            const replacement = fieldValue !== null && fieldValue !== undefined ? `'${fieldValue}'` : 'null';
            parsedCondition = parsedCondition.replace(new RegExp(`'${fieldName}'`, 'g'), replacement);
          }
        }
        // Else, leave the ref as-is (literal)
      }

      console.log(`Parsed condition: ${parsedCondition}`);

      // Evaluate the parsed condition
      const result = this.evaluateCondition(parsedCondition);
      console.log(`Evaluation result for field "${field.get('label')?.value}":`, result);

      return result;
    } catch (error) {
      console.error('Error evaluating visibility condition:', error);
      return true;
    }
  }

  // Helper method to check if a field exists
  checkIfFieldExists(fieldName: string): boolean {
    let exists = false;
    this.additionalFields.controls.forEach(row => {
      const fields = row.get('fields') as FormArray;
      fields.controls.forEach(fieldControl => {
        const fieldGroup = fieldControl as FormGroup;
        if (fieldGroup.get('label')?.value === fieldName) {
          exists = true;
        }
      });
    });
    return exists;
  }

  // Helper method to safely evaluate the condition
  evaluateCondition(condition: string): boolean {
    try {
      // Use a safe evaluation method
      return new Function(`return ${condition}`)();
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return true;
    }
  }
  onSingleDropdownChange(event: Event, rowIndex: number, fieldIndex: number, option: string): void {
    const field = this.getFields(rowIndex).at(fieldIndex);
    field.get('value')?.setValue(option);
    field.patchValue({ isOpen: false });
  }

  // Helper method to generate a unique ID if one doesn't exist
  generateUniqueId(): string {
    return 'field_' + new Date().getTime() + '_' + Math.random().toString(36).substr(2, 9);
  }
  onCheckboxChange(event: Event, rowIndex: number, fieldIndex: number): void {
    const checkboxArray = this.getFields(rowIndex).at(fieldIndex).get('value') as FormControl;
    const value = (event.target as HTMLInputElement).value;

    if ((event.target as HTMLInputElement).checked) {
      checkboxArray.setValue([...checkboxArray.value, value]);
    } else {
      checkboxArray.setValue(checkboxArray.value.filter((v: string) => v !== value));
    }
  }

  onDropdownChange(event: Event, rowIndex: number, fieldIndex: number): void {
    const selectElement = event.target as HTMLSelectElement;
    const field = this.getFields(rowIndex).at(fieldIndex) as FormGroup;

    if (field.value.allowMultipleSelection === true) {
      // Handle multiple selection
      const selectedOptions = Array.from(selectElement.selectedOptions).map(option => option.value);
      field.get('value')?.setValue(selectedOptions);
    } else {
      // Handle single selection
      const selectedValue = selectElement.value;
      field.get('value')?.setValue(selectedValue);
    }
  }



  getValidators(inputType: string) {
    switch (inputType) {
      case 'email':
        return [Validators.required, Validators.email];
      case 'text':
        return [Validators.required, Validators.minLength(3)];
      case 'checkbox':
        return [Validators.requiredTrue]; // Ensures checkbox is checked
      case 'radio':
        return [Validators.required];
      case 'dropdown':
        return [Validators.required]; // Dropdown requires a value
      default:
        return [Validators.required]; // Default validator
    }
  }

  getDynamicValidators(field: any): any[] {
    const validators = [];

    if (field.isrequired) {
        validators.push(Validators.required);
    }

    if (field.inputType === 'email') {
        validators.push(Validators.email);
    }

    if (field.inputType === 'number' && field.validateNumber && field.numberValidation) {
        const [beforeDecimalPart, afterDecimalPart] = field.numberValidation.split('.');
        const beforeDecimal = beforeDecimalPart.length; // Max allowed digits before decimal
        const afterDecimal = afterDecimalPart ? afterDecimalPart.length : 0; // Exact required decimal places

        // Updated regex to enforce decimal places strictly
        const regexPattern = new RegExp(`^\\d{1,${beforeDecimal}}\\.\\d{${afterDecimal}}$`);

        console.log("Applying pattern validator:", regexPattern);

        if (!field.softValidation) {
            // Hard validation: Enforce the pattern
            validators.push(Validators.pattern(regexPattern));
        }
    }

    return validators;
}


  validateNumberInput(event: KeyboardEvent) {
    const allowedChars = /[0-9.]/
    const inputChar = String.fromCharCode(event.keyCode);

    // Prevent multiple dots
    if (inputChar === '.' && (event.target as HTMLInputElement).value.includes('.')) {
      event.preventDefault();
    }

    if (!allowedChars.test(inputChar)) {
      event.preventDefault();
    }
  }



  get additionalFields(): FormArray {
    return this.previewForm?.get('additionalFields') as FormArray;
  }

  getFields(rowIndex: number): FormArray {
    return this.additionalFields.at(rowIndex).get('fields') as FormArray;
  }

  onSubmit() {
    if (this.previewForm?.valid) {
      console.log("Form is Valid:", this.previewForm.value);
      alert("Valid");
    } else {
      // 🔥 Mark all fields as touched to trigger error messages
      this.previewForm?.markAllAsTouched();
      console.log("Form is Valid:", this.previewForm?.value);
      console.log("Form Errors:", this.previewForm?.errors);
      alert("Invalid");
    }
    /* if (this.previewForm?.valid) {
      const formData = {
        ...this.previewForm.value,
        patientId: this.patientId,
        timepointId: this.timepointId,
        formId: this.route.snapshot.queryParams['formId']
      };

      // Ensure proper handling of allowMultipleSelection flag and validate IDs
      formData.additionalFields.forEach((rowGroup: any) => {
        rowGroup.fields.forEach((field: any) => {
          // Make sure each field has an ID
          if (!field.id) {
            field.id = this.generateUniqueId();
          }

          // Only include allowMultipleSelection for dropdown fields
          if (field.inputType === 'dropdown') {
            field.allowMultipleSelection = field.allowMultipleSelection === true;
          } else {
            delete field.allowMultipleSelection;
          }

          // Remove the isOpen property as it's UI-only
          delete field.isOpen;
        });
      });

      this.formService.addform(formData, this.formfieldId).subscribe({
        next: (res: any) => {

          localStorage.setItem('needsDataRefresh', 'true');
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
              next: (res) => {
                Swal.fire({
                  title: 'Success!',
                  text: 'Email sent successfully!',
                  icon: 'success',
                  confirmButtonText: 'OK'
                });

                const timestamp = new Date().getTime();
                this.router.navigate(['/patient/datematrix'], {
                  queryParams: {
                    id: this.patientId,
                    t: timestamp
                  }
                });


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

            if (this.previewForm) {
              this.previewForm.disable();
              this.prePopulatedFlag = true;
            }
          })
          const id = res.result._id
          this.userFormData = this.processSubmittedData(fields, userform);

        }, error: (err: any) => {
          console.log("errrorrr");
        }

      });
    } else {
      Swal.fire({
        title: 'Error!',
        text: 'Fill Required Fields correctly!',
        icon: 'error',
        confirmButtonText: 'OK'
      });
      console.log("Form is invalid");
    } */
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

    existingData.additionalFields.forEach((existingFieldObject: any) => {
      additionalFieldsControl.controls.forEach((fieldGroupControl) => {
        const fieldsFormArray = fieldGroupControl.get('fields') as FormArray;

        existingFieldObject.fields.forEach((existingField: any) => {
          const matchingField = fieldsFormArray.controls.find((control) => {
            const controlValue = control.value;
            // Match by id if available, otherwise fall back to matching by label and type
            return (existingField.id && controlValue.id === existingField.id) ||
                   (controlValue.inputType === existingField.inputType && controlValue.label === existingField.label);
          });

          if (matchingField) {
            const fieldFormGroup = matchingField as FormGroup;
            // Ensure the ID is set correctly
            fieldFormGroup.get('id')?.setValue(existingField.id || this.generateUniqueId());

            // IMPORTANT FIX: Preserve the allowMultipleSelection property correctly
            if (existingField.inputType === 'dropdown') {
              // Use the original field's setting if it exists, otherwise keep the current setting
              const useMultipleSelection = existingField.hasOwnProperty('allowMultipleSelection')
                ? existingField.allowMultipleSelection === true
                : fieldFormGroup.get('allowMultipleSelection')?.value === true;

              fieldFormGroup.get('allowMultipleSelection')?.setValue(useMultipleSelection);
            }

            // Handle value setting based on field type and allowMultipleSelection
            if (existingField.inputType === 'checkbox' ||
                (existingField.inputType === 'dropdown' &&
                 (existingField.allowMultipleSelection === true || fieldFormGroup.get('allowMultipleSelection')?.value === true))) {
              // Make sure the value is an array
              const valueArray = Array.isArray(existingField.value) ? existingField.value :
                                (existingField.value ? [existingField.value] : []);
              fieldFormGroup.get('value')?.setValue(valueArray);
            } else {
              // For radio buttons and single selection dropdowns, set the selected value
              fieldFormGroup.get('value')?.setValue(existingField.value || '');
            }
          }
        });
      });
    });

    this.previewForm.disable();
    this.editModeFlag = false;
    this.prePopulatedFlag = true;
  }

  formatValue(value: any, fieldType: string): string {
    if (fieldType === 'dropdown' && Array.isArray(value)) {
      return value.join(', ');
    }
    return value || '';
  }

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

      // Validate IDs and remove UI-only properties
      formData.additionalFields.forEach((rowGroup: any) => {
        rowGroup.fields.forEach((field: any) => {
          // Make sure each field has an ID
          if (!field.id) {
            field.id = this.generateUniqueId();
          }

          // Remove UI-only properties
          delete field.isOpen;
        });
      });

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
        if (this.patientData) {
          pdf.save(this.patientData.id + "_" + this.patientData.name + "_" + this.formData.title + '.pdf');
        } else {
          pdf.save(this.formData.title + '.pdf');
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

  fetchPatientData() {
    if (this.patientId) {
      this.patientService.getPatientById(this.patientId).subscribe({
        next: (response) => {
          console.log("patinent data : ", response);
          this.patientData = response;
        }
      });
    }
  }


toggleDropdown(rowIndex: number, fieldIndex: number): void {
  if (!this.previewForm || this.previewForm.disabled) return;

  const field = this.getFields(rowIndex).at(fieldIndex);
  field.patchValue({ isOpen: !field.value.isOpen });

  this.additionalFields.controls.forEach((row, rIndex) => {
    const fields = row.get('fields') as FormArray;
    fields.controls.forEach((f, fIndex) => {
      if (rIndex !== rowIndex || fIndex !== fieldIndex) {
        if (f.value.isOpen) {
          f.patchValue({ isOpen: false });
        }
      }
    });
  });
}

isOptionSelected(selectedValues: any[], option: string): boolean {
  if (Array.isArray(selectedValues)) {
    return selectedValues.includes(option);
  } else {
    return selectedValues === option;
  }
}


isAllSelected(selectedValues: any[], options: string[]): boolean {
  return Array.isArray(selectedValues) &&
         options.length > 0 &&
         options.every(opt => selectedValues.includes(opt));
}


toggleSelectAll(event: Event, rowIndex: number, fieldIndex: number): void {
  const isChecked = (event.target as HTMLInputElement).checked;
  const field = this.getFields(rowIndex).at(fieldIndex);
  const options = field.value.options;

  if (isChecked) {


    field.get('value')?.setValue([...options]);
  } else {

    field.get('value')?.setValue([]);
  }
}


toggleOption(event: Event, rowIndex: number, fieldIndex: number, option: string): void {
  const isChecked = (event.target as HTMLInputElement).checked;
  const field = this.getFields(rowIndex).at(fieldIndex);
  const currentValue = field.get('value')?.value || [];

  if (isChecked) {

    if (!currentValue.includes(option)) {
      field.get('value')?.setValue([...currentValue, option]);
    }
  } else {

    field.get('value')?.setValue(currentValue.filter((val: string) => val !== option));
  }
}

getSelectedOptionsText(selectedValues: any[], options: string[]): string {
  if (!selectedValues || selectedValues.length === 0) {
    return 'Select options';
  }

  if (Array.isArray(selectedValues)) {
    if (selectedValues.length === options.length) {
      return 'All selected';
    }
    return selectedValues.join(' ');
  } else {
    return selectedValues;
  }
}


@HostListener('document:click', ['$event'])
onDocumentClick(event: MouseEvent): void {

  if (this.previewForm) {
    let clickedInsideDropdown = false;


    const dropdowns = document.querySelectorAll('.dropdown-container');
    dropdowns.forEach(dropdown => {
      if (dropdown.contains(event.target as Node)) {
        clickedInsideDropdown = true;
      }
    });

    if (!clickedInsideDropdown) {
      this.additionalFields.controls.forEach(row => {
        const fields = row.get('fields') as FormArray;
        fields.controls.forEach(field => {
          if (field.value.isOpen) {
            field.patchValue({ isOpen: false });
          }
        });
      });
    }
  }

}
}
