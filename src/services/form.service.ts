import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FormService {

  //apiUrl = "http://localhost:3000"
  constructor(private http:HttpClient) { }

  getSubmittedForm(patientId: string, timepointId: string, formId: string): Observable<any> {
    return this.http.get(`${environment.api}/submitted`, {
      params: { patientId, timepointId, formId },
    });
  }

  updateSubmittedResponse(payload : Object) {
    console.log("data from updateSubmittedResponse", payload);
    return this.http.post(`${environment.api}/update`, payload);
  }

  addform(data:any,fieldsId:any){
    console.log("data from addform",data);
    const payload = { ...data, fieldsId };


   return this.http.post(`${environment.api}/addform`,payload)
  }

  getUserForm(id:any){
    return this.http.get(`${environment.api}/getUserForm/${id}`)
  }

  addFormFields(data: any, formId: any) {
    console.log("Sending to API:", { data, formId });
    return this.http.post(`${environment.api}/addformfields`, { data, formId });
  }

  getFormFields(id:any)
  {
    return this.http.get(`${environment.api}/getformfields/${id}`);
  }

  getAllFormFields(){
    return this.http.get(`${environment.api}/getallformsFields`)
  }

  getAllResponses(patientId: string){
    return this.http.get(`${environment.api}/allResponses/${patientId}`)
  }


  updateFormFields(id:any,data:any){
    const {title,addformfields} = data
    return this.http.patch(`${environment.api}/updateFormFields/${id}`,{data})
  }

  saveFormLink(id:any,formLink:string){
    console.log('Sending data to server:', formLink);
    return this.http.put(`${environment.api}/savelinktoFormFields/${id}`,{formLink})
  }

  deleteFormFields(id: any) {
    return this.http.delete(`${environment.api}/deleteformfields/${id}`);
  }

  fetchUserForms(id:any){
    return this.http.get(`${environment.api}/getallUserForms/${id}`);
  }

  deleteOneUserForm(id:any){
    return this.http.delete(`${environment.api}/deleteUserForm/${id}`);
  }
}
