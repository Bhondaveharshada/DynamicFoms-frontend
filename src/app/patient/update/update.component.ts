import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PatientService } from '../service/patient-service.service';  // Assuming you have a service to manage patient data
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-update',
  imports:[CommonModule, FormsModule],
  templateUrl: './update.component.html',
  styleUrls: ['./update.component.css']
})
export class UpdateComponent implements OnInit {
  patient: any = { name: '', email: '', phone: '', birthdate: '' };
  patientId: string = '';
  originalPatientData: any = {}; // To hold the original patient data for comparison

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private patientService: PatientService // Assuming you have a service for CRUD operations
  ) {}

  ngOnInit(): void {
    // Get the patient ID from the route parameters
    this.patientId = this.route.snapshot.paramMap.get('id')!;
    // Fetch patient details by ID and populate the form
    this.getPatientDetails(this.patientId);
  }

  // Fetch the patient details
  getPatientDetails(id: string): void {
    this.patientService.getPatientById(id).subscribe((data) => {
      this.patient = data;
      this.originalPatientData = { ...data }; // Save the original data for comparison
    });
  }

  // Submit the updated patient data
  onSubmit(): void {
    // Prepare a string to hold the updated fields
    let updatedFields: string[] = [];

    // Compare each field with the original data to check for changes
    if (this.patient.name !== this.originalPatientData.name) {
      updatedFields.push(`<b>Name:</b> ${this.patient.name}`);
    }
    if (this.patient.email !== this.originalPatientData.email) {
      updatedFields.push(`<b>Email:</b> ${this.patient.email}`);
    }
    if (this.patient.phone !== this.originalPatientData.phone) {
      updatedFields.push(`<b>Phone:</b> ${this.patient.phone}`);
    }
    if (this.patient.birthdate !== this.originalPatientData.birthdate) {
      updatedFields.push(`<b>Birthdate:</b> ${this.patient.birthdate}`);
    }

    // If no fields were updated
    if (updatedFields.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No Changes',
        text: 'No fields were updated.',
      });
      return;
    }

    // Show the SweetAlert with the updated fields
    Swal.fire({
      title: 'Are you sure?',
      html: `You are about to update the following fields:<br><br>${updatedFields.join('<br>')}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, update it!',
    }).then((result) => {
      if (result.isConfirmed) {
        // If confirmed, proceed with the update
        this.patientService.updatePatient(this.patientId, this.patient).subscribe(() => {
          this.router.navigate(['/patient']); // Redirect to the patient list after update
          Swal.fire('Updated!', 'The patient details have been updated.', 'success');
        }, (error) => {
          console.error('Error updating patient:', error);
          Swal.fire('Error!', 'There was an issue updating the patient details.', 'error');
        });
      }
    });
  }

  // Go back to the patient list
  navigateBack(): void {
    this.router.navigate(['/patient']);
  }
}
