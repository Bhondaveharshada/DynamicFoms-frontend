import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { TimepointService } from '../Service/timepoint.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-list',
  imports: [CommonModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.css'
})
export class ListTimepointComponent {

  timepoints: any[] = []; // Stores the fetched timepoints

  constructor(
    private timepointService: TimepointService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchTimepoints();
  }

  // Fetch all timepoints from the service
  fetchTimepoints(): void {
    this.timepointService.getTimepoints().subscribe(
      (data) => {
        this.timepoints = data;
      },
      (error) => {
        console.error('Error fetching timepoints:', error);
      }
    );
  }

  // Navigate to the add timepoint page
  navigateToAdd(): void {
    this.router.navigate(['/timepoint/create']);
  }

  // Navigate to the edit timepoint page
  editTimepoint(id: number): void {
    this.router.navigate([`/timepoint/update/${id}`]);
  }

  // Confirm deletion of a timepoint
  confirmDelete(id: number): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'This action cannot be undone!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteTimepoint(id);
      }
    });
  }

  // Delete the timepoint
  deleteTimepoint(id: number): void {
    this.timepointService.deleteTimepoint(id).subscribe(
      () => {
        Swal.fire('Deleted!', 'The time point has been deleted.', 'success');
        this.fetchTimepoints(); // Refresh the list after deletion
      },
      (error) => {
        console.error('Error deleting timepoint:', error);
        Swal.fire('Error!', 'There was an issue deleting the timepoint.', 'error');
      }
    );
  }
}
