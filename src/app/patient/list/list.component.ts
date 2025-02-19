import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PatientService } from '../service/patient-service.service'; // Make sure to create a patient service
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-list',
  imports:[CommonModule],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.css']
})
export class ListComponent implements OnInit {
  patients: any[] = []; // Array to hold patients list

  constructor(private router: Router, private patientService: PatientService) {}

  ngOnInit() {
    this.getPatients(); // Fetch patients when component is initialized
  }

  // Method to navigate to Add Patient page
  navigateToAdd() {
    this.router.navigate(['/patient/create']);
  }

  // Fetch the list of patients from the API
  getPatients() {
    this.patientService.getPatients().subscribe(
      (data: any[]) => {
        this.patients = data;
      },
      (error) => {
        console.error('Error fetching patient data', error);
      }
    );
  }

  // Edit patient method (you can implement this based on your needs)
  editPatient(patientId: string) {
    this.router.navigate([`/patient/update/${patientId}`]);
  }

  // Delete patient method
  deletePatient(patientId: string): void {
    // Show confirmation dialog with SweetAlert2
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to revert this!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    }).then((result) => {
      if (result.isConfirmed) {
        // If confirmed, call the delete API method
        this.patientService.deletePatient(patientId).subscribe(
          (response) => {
            console.log('Patient deleted successfully:', response);
            this.getPatients(); // Refresh the patient list after deletion
            Swal.fire(
              'Deleted!',
              'The patient has been deleted.',
              'success'
            );
          },
          (error) => {
            console.error('Error deleting patient:', error);
            Swal.fire(
              'Error!',
              'There was an issue deleting the patient.',
              'error'
            );
          }
        );
      }
    });
  }

  home() {
    this.router.navigate([`/`]);
  }

  goToDateMatrix(patientId: number): void {
    this.router.navigate(['/patient/datematrix'], { queryParams: { id: patientId } });
  }

}
