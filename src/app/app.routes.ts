import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { RegisterSuccessComponent } from './components/register-success/register-success.component';
import { HomeComponent } from './components/home/home.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'register',
    component: RegisterComponent,
  },
  {
    path: 'register-success',
    component: RegisterSuccessComponent,
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: HomeComponent,
      },
    ],
  },
  {
    path: '**',
    redirectTo: '/login',
  },
];
