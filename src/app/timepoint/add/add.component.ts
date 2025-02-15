import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import Swal from 'sweetalert2';
import { TimepointService } from '../Service/timepoint.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-add',
  imports: [CommonModule, FormsModule],
  templateUrl: './add.component.html',
  styleUrl: './add.component.css'
})
export class AddTimepointComponent {
  interval = {
    name: '',
    interval: 0, // Number of days
  };

  constructor(
    private intervalService: TimepointService,
    private router: Router,
    private location: Location
  ) {}

  // Method to handle form submission
  onSubmit() {
    if (!this.interval.name || this.interval.interval < 0) {
      Swal.fire('Error', 'Please fill out the form correctly.', 'error');
      return;
    }

    // Prepare data for confirmation
    const intervalData = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <b>Name:</b> <span>${this.interval.name}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <b>Interval (in days):</b> <span>${this.interval.interval}</span>
      </div>
    `;

    // Show SweetAlert for confirmation
    Swal.fire({
      title: 'Confirm Add Interval',
      html: intervalData,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, Add Interval!',
    }).then((result) => {
      if (result.isConfirmed) {
        // Save data via the service
        this.intervalService.addInterval(this.interval).subscribe(
          (response) => {
            Swal.fire('Added!', 'The interval has been added successfully.', 'success');
            this.router.navigate(['/timepoint']); // Redirect to the list page
          },
          (error) => {
            console.error('Error adding interval:', error);
            Swal.fire('Error!', 'There was an issue adding the interval.', 'error');
          }
        );
      }
    });
  }

  // Navigate back to the previous page
  navigateBack() {
    this.location.back();
  }
}


