import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TimepointService } from '../Service/timepoint.service';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-update-timepoint',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './update.component.html',
  styleUrls: ['./update.component.css'],
})
export class UpdateTimepointComponent implements OnInit {
  timepointForm: FormGroup;
  timepointId: number;

  constructor(
    private fb: FormBuilder,
    private timepointService: TimepointService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.timepointForm = this.fb.group({
      name: ['', Validators.required],
      interval: [0, [Validators.required, Validators.min(0)]],
    });
    this.timepointId = 0;
  }

  ngOnInit(): void {
    // Get timepoint ID from the route and fetch its details
    this.timepointId = Number(this.route.snapshot.paramMap.get('id'));
    this.fetchTimepointDetails();
  }

  // Fetch the details of the timepoint to populate the form
  fetchTimepointDetails(): void {
    this.timepointService.getTimepointById(this.timepointId).subscribe(
      (data) => {
        this.timepointForm.patchValue({
          name: data.name,
          interval: data.interval,
        });
      },
      (error) => {
        console.error('Error fetching timepoint details:', error);
      }
    );
  }

  // Handle form submission to update the timepoint
  onSubmit(): void {
    if (this.timepointForm.valid) {
      const updatedTimepoint = this.timepointForm.value;

      // Show confirmation alert before updating
      Swal.fire({
        icon: 'question',
        title: 'Confirm Update',
        text: 'Are you sure you want to update this timepoint?',
        showCancelButton: true,
        confirmButtonText: 'Yes, Update',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#dc3545',
      }).then((result) => {
        if (result.isConfirmed) {
          // Proceed with the update
          this.timepointService.updateTimepoint(this.timepointId, updatedTimepoint).subscribe(
            () => {
              // Success alert
              Swal.fire({
                icon: 'success',
                title: 'Updated Successfully',
                text: 'The timepoint has been updated!',
                confirmButtonColor: '#28a745',
              }).then(() => {
                this.router.navigate(['/timepoint']); // Navigate back to the list
              });
            },
            (error) => {
              console.error('Error updating timepoint:', error);
              // Error alert
              Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: 'Failed to update the timepoint. Please try again.',
                confirmButtonColor: '#dc3545',
              });
            }
          );
        }
      });
    }
  }

  // Navigate back to the list page
  navigateBack(): void {
    this.router.navigate(['/timepoint']);
  }
}
