// patient.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PatientService {
  private apiUrl = `${environment.api}/patient`; // Adjust to your API URL

  constructor(private http: HttpClient) {}

  addPatient(patient: any): Observable<any> {
    return this.http.post(this.apiUrl, patient);
  }

  getPatients(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  deletePatient(patientId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${patientId}`);
  }

    // Get patient by ID
    getPatientById(id: string): Observable<any> {
      return this.http.get(`${this.apiUrl}/${id}`);
    }

    // Update patient data
    updatePatient(id: string, patientData: any): Observable<any> {
      return this.http.put(`${this.apiUrl}/${id}`, patientData);
    }
}
