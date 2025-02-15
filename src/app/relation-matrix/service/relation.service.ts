import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RelationService {
  private apiUrl = `${environment.api}/relation`;
  constructor(private http: HttpClient) { }

  saveRelations(relations: { formId: string; timepoints: string[] }[]): Observable<any> {
    return this.http.post(this.apiUrl, { relations });
  }

  getAllRelations(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  getRelationByFormId(formId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${formId}`);
  }

}
