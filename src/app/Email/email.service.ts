import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class EmailService {

  constructor(private http:HttpClient) { }

  baseUrl = environment.api

  sendEmail(data: object) {
    const url = `${this.baseUrl}/email/formSubmitted`;
    return this.http.post(url, { data });
  }
}
