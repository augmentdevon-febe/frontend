import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router, RouterOutlet, Routes } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { authGuard } from '../core/guards/auth.guard';
import { authInterceptor } from '../core/interceptors/auth.interceptor';
import { AuthService } from '../core/services/auth.service';
import { LoginComponent } from '../pages/login/login.component';

@Component({
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />'
})
class ShellComponent {}

@Component({
  standalone: true,
  template: '<p>Predict Protected Page</p>'
})
class PredictProtectedStubComponent {}

describe('Integration: chained auth flow', () => {
  const authServiceMock = {
    getSession: vi.fn(),
    startGoogleLogin: vi.fn(),
    logout: vi.fn()
  };

  const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'predict', component: PredictProtectedStubComponent, canActivate: [authGuard] },
    { path: '', pathMatch: 'full', redirectTo: 'login' }
  ];

  let isAuthenticated = false;

  beforeEach(async () => {
    isAuthenticated = false;

    authServiceMock.getSession.mockReset();
    authServiceMock.startGoogleLogin.mockReset();
    authServiceMock.logout.mockReset();

    authServiceMock.getSession.mockImplementation(() =>
      of({ authenticated: isAuthenticated })
    );

    await TestBed.configureTestingModule({
      imports: [ShellComponent, NoopAnimationsModule],
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: authServiceMock
        }
      ]
    }).compileComponents();
  });

  afterEach(() => {
    const httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.verify();
  });

  it('handles guarded navigation, returnUrl recovery, and 401 expiration in one flow', async () => {
    const fixture = TestBed.createComponent(ShellComponent);
    const router = TestBed.inject(Router);
    const httpClient = TestBed.inject(HttpClient);
    const httpTesting = TestBed.inject(HttpTestingController);

    // 1) User is unauthenticated and tries to enter /predict.
    await router.navigateByUrl('/predict');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(router.url).toBe('/login?returnUrl=%2Fpredict');

    // 2) Login action reuses returnUrl and targets /predict.
    isAuthenticated = true;
    const loginDebugElement = fixture.debugElement.query(By.directive(LoginComponent));
    const loginComponent = loginDebugElement.componentInstance as LoginComponent;
    loginComponent.startLogin();

    expect(authServiceMock.startGoogleLogin).toHaveBeenCalledWith('/predict');

    // 2b) Session is now valid, so guard allows entering /predict.
    await router.navigateByUrl('/predict');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(router.url).toBe('/predict');

    // 3) A protected API call receives 401; interceptor must return user to login with returnUrl.
    isAuthenticated = false;
    const responsePromise = firstValueFrom(httpClient.get('/api/matches'));
    const request = httpTesting.expectOne('/api/matches');

    expect(request.request.withCredentials).toBe(true);

    request.flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    await expect(responsePromise).rejects.toBeInstanceOf(HttpErrorResponse);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(router.url).toBe('/login?returnUrl=%2Fpredict');
  });
});
