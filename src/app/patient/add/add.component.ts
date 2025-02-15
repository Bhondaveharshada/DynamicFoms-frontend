import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { PatientService } from '../service/patient-service.service'; // Assuming you have a service for API calls
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-add',
  imports: [FormsModule, CommonModule],
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.css'],
})
export class AddComponent {
  patient = {
    name: '',
    email: '',
    phone: '',
    birthdate: '',
  };

  constructor(private patientService: PatientService, private router: Router, private location: Location) { }

  // Handle form submission
  onSubmit() {
    // Prepare the patient data for confirmation with better alignment
    const patientData = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <b>Name:</b> <span>${this.patient.name}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <b>Email:</b> <span>${this.patient.email}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <b>Phone:</b> <span>${this.patient.phone}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <b>Birthdate:</b> <span>${this.patient.birthdate}</span>
      </div>
    `;

    // Show SweetAlert for confirmation
    Swal.fire({
      title: 'Are you sure you want to add this patient?',
      html: patientData, // Display the data to confirm
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, add patient!',
    }).then((result) => {
      if (result.isConfirmed) {
        // Proceed with adding the patient if confirmed
        this.patientService.addPatient(this.patient).subscribe(
          (response) => {
            this.router.navigate(['/patient']); // Redirect to the patient list after successful addition
            Swal.fire('Added!', 'The patient has been added successfully.', 'success');
          },
          (error) => {
            console.error('Error adding patient:', error);
            Swal.fire('Error!', 'There was an issue adding the patient.', 'error');
          }
        );
      }
    });
  }


  // Method to navigate back to the previous page
  navigateBack() {
    this.location.back(); // Uses the Location service to go back to the previous page
  }
}
