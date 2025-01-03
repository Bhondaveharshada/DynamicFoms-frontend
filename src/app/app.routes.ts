import { Routes } from '@angular/router';
import { FormComponent } from '../form/form.component';
import { FormgenerateComponent } from '../formgenerate/formgenerate.component';
import { AllFormsComponent } from '../all-forms/all-forms.component';
import { UserformsComponent } from '../userforms/userforms.component';

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
}
];
