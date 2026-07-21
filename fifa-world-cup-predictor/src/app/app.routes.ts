import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { PredictionComponent } from './pages/prediction/prediction.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
	{ path: 'login', component: LoginComponent },
	{ path: 'predict', component: PredictionComponent, canActivate: [authGuard] },
	{ path: '', pathMatch: 'full', redirectTo: 'login' },
	{ path: '**', redirectTo: 'login' }
];
