import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormService } from '../../../services/form.service';
import { RelationService } from '../../relation-matrix/service/relation.service';
import { TimepointService } from '../../timepoint/Service/timepoint.service';
import { PatientService } from '../service/patient-service.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-timepoints',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  filledResponses: any[] = [];
  
  constructor(
    private route: ActivatedRoute,
    private relationService: RelationService,
    private formService: FormService,
    private timepointService: TimepointService,
    private patientService: PatientService,
    private router: Router,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.patientId = params['id'];
      this.getSubmittedResponses();
      this.fetchData();
    });
  }

  getSubmittedResponses() {
    this.formService.getAllResponses(this.patientId).subscribe({
      next: (response: any) => {
        this.filledResponses = response.data || [];
      },
      error: (err) => console.error('Error fetching responses:', err)
    });
  }

  async fetchData(): Promise<void> {
    try {
      const [relationsResponse, formsResponse, timepointsResponse, patientResponse]: any[] = await Promise.all([
        firstValueFrom(this.relationService.getAllRelations()),
        firstValueFrom(this.formService.getAllFormFields()),
        firstValueFrom(this.timepointService.getTimepoints()),
        firstValueFrom(this.patientService.getPatientById(this.patientId))
      ]);

      this.relations = relationsResponse?.data || [];
      this.forms = formsResponse?.result || [];
      this.timepoints = timepointsResponse || [];
      this.onboardDate = patientResponse?.onboardDate ? new Date(patientResponse.onboardDate) : null;

      this.generateTableData();
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  async generateTableData(): Promise<void> {
    if (!this.onboardDate || !this.relations.length || !this.forms.length || !this.timepoints.length) {
      return;
    }

    this.headers = ['Form Name', ...this.timepoints.map(tp => tp.name)];

    // Fetch versions for all forms in parallel
    const formsWithVersions = await Promise.all(this.forms.map(async form => {
      const versions = await this.getFormVersions(form._id);
      return {
        ...form,
        versions: versions,
        selectedVersion: versions[0] // Default to first version (latest)
      };
    }));

    this.tableData = formsWithVersions.map(formWithVersions => {
      const relatedTimepointIds = this.relations
        .filter(rel => rel.formId === formWithVersions._id)
        .flatMap(rel => rel.timepoints);

      const row: any = {
        formName: formWithVersions.title,
        formId: formWithVersions._id,
        versions: formWithVersions.versions,
        selectedVersion: formWithVersions.versions[0] // Default to first version (latest)
      };

      this.timepoints.forEach(timepoint => {
        if (relatedTimepointIds.includes(timepoint._id)) {
          const interval = timepoint.interval || 0;
          const date = new Date(this.onboardDate!);
          date.setDate(date.getDate() + interval);

          const formattedDate = date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          }).replace(/ /g, '-');

          const isFilled = this.filledResponses.some(
            response => response.formId === formWithVersions._id && 
                       response.timepointId === timepoint._id
          );

          row[timepoint.name] = isFilled ? `${formattedDate} ✔` : formattedDate;
        } else {
          row[timepoint.name] = '-';
        }
      });

      return row;
    });
  }

  async getFormVersions(formId: string): Promise<any[]> {
    try {
      const response: any = await firstValueFrom(this.http.get(`${environment.api}/forms/${formId}/versions`));
      return response?.result || [];
    } catch (error) {
      console.error('Error fetching versions:', error);
      return [];
    }
  }

  updateVersionLink(row: any): void {
    // This method will be called when the version selection changes
    console.log('Version updated:', row.selectedVersion);
    // No need to do anything else as the binding will update automatically
  }

  generateFormLink(row: any, timepoint: any): string {
    // Using the selected version directly from the row
    return `${row.selectedVersion.formLink}?patientId=${this.patientId}&formId=${row.selectedVersion._id}&timepointId=${timepoint._id}`;
  }

  back(): void {
    this.router.navigate([`/patient`]);
  }
}