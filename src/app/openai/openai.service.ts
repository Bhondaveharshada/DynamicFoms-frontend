import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OpenaiService {
  private apiUrl = `${environment.api}/openai`;
  constructor(private http: HttpClient) {}

  generateResponse(prompt: string): Observable<any> {
    let body = {
      prompt
    }
    return this.http.post(this.apiUrl, body);
  }
}
