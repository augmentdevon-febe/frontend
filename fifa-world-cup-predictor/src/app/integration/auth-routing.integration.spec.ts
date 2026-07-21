import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, Routes } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { authGuard } from '../core/guards/auth.guard';
import { authInterceptor } from '../core/interceptors/auth.interceptor';
import { AuthService } from '../core/services/auth.service';

@Component({
  standalone: true,
  template: '<p>Login</p>'
})
class LoginStubComponent {}

@Component({
  standalone: true,
  template: '<p>Protected</p>'
})
class ProtectedStubComponent {}

describe('Integration: guarded routing + auth interceptor', () => {
  const authServiceMock = {
    getSession: vi.fn()
  };

  const routes: Routes = [
    { path: 'login', component: LoginStubComponent },
    { path: 'predict', component: ProtectedStubComponent, canActivate: [authGuard] },
    { path: '', pathMatch: 'full', redirectTo: 'login' }
  ];

  beforeEach(() => {
    authServiceMock.getSession.mockReset();

    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: authServiceMock
        }
      ]
    });
  });

  afterEach(() => {
    const httpTesting = TestBed.inject(HttpTestingController);
    httpTesting.verify();
  });

  it('redirects unauthenticated navigation from /predict to /login', async () => {
    authServiceMock.getSession.mockReturnValue(of({ authenticated: false }));
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/predict');

    expect(router.url).toBe('/login?returnUrl=%2Fpredict');
  });

  it('redirects unauthenticated navigation preserving query params in returnUrl', async () => {
    authServiceMock.getSession.mockReturnValue(of({ authenticated: false }));
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/predict?stage=group');

    expect(router.url).toBe('/login?returnUrl=%2Fpredict%3Fstage%3Dgroup');
  });

  it('redirects to /login when guard session check fails', async () => {
    authServiceMock.getSession.mockReturnValue(
      throwError(() => new Error('session request failed'))
    );
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/predict');

    expect(router.url).toBe('/login?returnUrl=%2Fpredict');
  });

  it('allows /predict and redirects to login on API 401 with returnUrl', async () => {
    authServiceMock.getSession.mockReturnValue(of({ authenticated: true }));

    const router = TestBed.inject(Router);
    const httpClient = TestBed.inject(HttpClient);
    const httpTesting = TestBed.inject(HttpTestingController);
    const navigateSpy = vi.spyOn(router, 'navigate');

    await router.navigateByUrl('/predict');
    expect(router.url).toBe('/predict');

    const responsePromise = firstValueFrom(httpClient.get('/api/matches'));
    const request = httpTesting.expectOne('/api/matches');

    expect(request.request.withCredentials).toBe(true);

    request.flush({ message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    await expect(responsePromise).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/predict' }
    });
  });
});
