import { TimepointService } from './../../timepoint/Service/timepoint.service';
import { FormService } from './../../../services/form.service';
import { RelationService } from './../../relation-matrix/service/relation.service';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PatientService } from '../service/patient-service.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-timepoints',
  imports: [CommonModule],
  templateUrl: './timepoints.component.html',
  styleUrls: ['./timepoints.component.css']
})
export class TimepointsComponent implements OnInit {
  patientId: any = null;
  onboardDate: Date | null = null;
  relations: any[] = [];
  forms: any[] = [];
  timepoints: any[] = [];
  tableData: any[] = [];
  headers: string[] = ['Form Name'];

  constructor(
    private route: ActivatedRoute,
    private relationService: RelationService,
    private formService: FormService,
    private timepointService: TimepointService,
    private patientService: PatientService
  ) { }

  ngOnInit(): void {
    // Fetch patientId from query params
    this.route.queryParams.subscribe((params) => {
      this.patientId = params['id'];
      this.fetchData();
    });
  }

  fetchData(): void {
    // Track the completion of all service calls
    const relations$ = this.relationService.getAllRelations();
    const forms$ = this.formService.getAllFormFields();
    const timepoints$ = this.timepointService.getTimepoints();
    const patient$ = this.patientService.getPatientById(this.patientId);

    // Wait for all data to be fetched
    Promise.all([
      relations$.toPromise(),
      forms$.toPromise(),
      timepoints$.toPromise(),
      patient$.toPromise()
    ])
      .then(([relationsResponse, formsResponse, timepointsResponse, patientResponse]: any[]) => {
        // Set the data from service responses
        this.relations = relationsResponse.data;
        this.forms = formsResponse.result;
        this.timepoints = timepointsResponse;
        this.onboardDate = new Date(patientResponse.onboardDate);

        // Generate the table data
        console.log("data fetched sucessfully");

        this.generateTableData();
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
      });
  }


  generateTableData(): void {
    if (!this.onboardDate || !this.relations.length || !this.forms.length || !this.timepoints.length) {
      return; // Wait until all data is fetched
    }

    // Add headers dynamically: First column is "Form Name", followed by all timepoints
    this.headers = ['Form Name', ...this.timepoints.map((tp) => tp.name)];

    // Generate table data
    this.tableData = this.forms.map((form) => {
      // Find related timepoints for this form based on relations
      const relatedTimepointIds = this.relations
        .filter((rel) => rel.formId === form._id) // Match relations by formId
        .flatMap((rel) => rel.timepoints); // Extract timepoint IDs as an array

      console.log(`Form: ${form.title}, Related Timepoint IDs: `, relatedTimepointIds);

      // Build the row: Start with form name
      const row: any = { formName: form.title };

      // Add timepoint dates to the row
      this.timepoints.forEach((timepoint) => {
        if (relatedTimepointIds.includes(timepoint._id)) {
          // If the timepoint is related, calculate the date based on the interval
          const interval = timepoint.interval || 0; // Default interval is 0 days
          const date = new Date(this.onboardDate!);
          date.setDate(this.onboardDate!.getDate() + interval); // Calculate date based on interval
          row[timepoint.name] = date.toLocaleDateString(); // Add date to the row
        } else {
          // If no relation, leave the cell empty or use '-'
          row[timepoint.name] = '-';
        }
      });

      return row;
    });

    console.log('Headers:', this.headers);
    console.log('Table Data:', this.tableData);
  }

}
