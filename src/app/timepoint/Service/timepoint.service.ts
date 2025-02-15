import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TimepointService {

  constructor(private http: HttpClient) {}

  private apiUrl = `${environment.api}/timepoint`; // Adjust to your API URL

  getTimepoints(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Delete a timepoint by ID
  deleteTimepoint(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Add interval
  addInterval(interval: any): Observable<any> {
    console.log(interval);

    return this.http.post(this.apiUrl, interval);
  }

  // Get all intervals
  getIntervals(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Get interval by ID
// Fetch timepoint by ID
getTimepointById(id: number): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}/${id}`);
}

// Update a timepoint
  updateTimepoint(id: number, timepoint: any): Observable<any> {
  return this.http.put<any>(`${this.apiUrl}/${id}`, timepoint);
}

  // Delete interval
  deleteInterval(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
