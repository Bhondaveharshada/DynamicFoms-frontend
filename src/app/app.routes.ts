import { Routes } from '@angular/router';
import { FormComponent } from '../form/form.component';
import { FormgenerateComponent } from '../formgenerate/formgenerate.component';
import { AllFormsComponent } from '../all-forms/all-forms.component';
import { UserformsComponent } from '../userforms/userforms.component';
import { DragdropComponent } from '../dragdrop/dragdrop.component';
import { UpdateformComponent } from '../updateform/updateform.component';
import { PatientComponent } from './patient/patient.component';
import { AddComponent } from './patient/add/add.component';
import { ListComponent } from './patient/list/list.component';
import { UpdateComponent } from './patient/update/update.component';
import { TimepointComponent } from './timepoint/timepoint.component';
import { ListTimepointComponent } from './timepoint/list/list.component';
import { AddTimepointComponent } from './timepoint/add/add.component';
import { UpdateTimepointComponent } from './timepoint/update/update.component';
import { RelationMatrixComponent } from './relation-matrix/relation-matrix.component';
import { TimepointsComponent } from './patient/timepoints/timepoints.component';

export const routes: Routes = [{
    path:"register", component:FormComponent

},
{
    path:"form/:id/:formId", component:FormgenerateComponent
},
{
    path:"",redirectTo:'allForms' ,pathMatch:'full'
},
{
    path:"allForms" , component:AllFormsComponent
},
{
    path:"userFormsDetails/:id", component:UserformsComponent
},
{
    path:"dragdrop", component:DragdropComponent
},
{
    path:'updateform/:id',component:UpdateformComponent
},
{
  path:'patient', component: PatientComponent,
  children : [
    {
      path:'', component:ListComponent
    },
    {
      path:'create', component: AddComponent
    },
    {
      path:'update/:id', component: UpdateComponent
    },
    {
      path: 'datematrix', component: TimepointsComponent
    }
  ]
},
{
  path:'timepoint', component: TimepointComponent,
  children: [
    {
      path: '', component: ListTimepointComponent
    },
    {
      path: 'create', component: AddTimepointComponent,
    },
    {
      path: 'update/:id', component: UpdateTimepointComponent,
    }
  ]
},
{
  path: 'relation', component: RelationMatrixComponent,
}

];
