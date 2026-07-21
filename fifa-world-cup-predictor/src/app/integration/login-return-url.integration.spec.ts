import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet, Routes } from '@angular/router';
import { of, throwError } from 'rxjs';
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
  template: '<p>Predict</p>'
})
class PredictStubComponent {}

describe('Integration: login returnUrl flow', () => {
  const authServiceMock = {
    getSession: vi.fn(),
    startGoogleLogin: vi.fn()
  };

  const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'predict', component: PredictStubComponent },
    { path: '', pathMatch: 'full', redirectTo: 'login' }
  ];

  beforeEach(async () => {
    authServiceMock.getSession.mockReset();
    authServiceMock.startGoogleLogin.mockReset();

    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideRouter(routes),
        {
          provide: AuthService,
          useValue: authServiceMock
        }
      ]
    }).compileComponents();
  });

  function getLoginComponent(fixture: ReturnType<typeof TestBed.createComponent<ShellComponent>>): LoginComponent {
    const loginDebugElement = fixture.debugElement.query(By.directive(LoginComponent));
    return loginDebugElement.componentInstance as LoginComponent;
  }

  it('uses returnUrl query parameter when starting Google login', async () => {
    authServiceMock.getSession.mockReturnValue(of({ authenticated: false }));

    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(ShellComponent);

    await router.navigateByUrl('/login?returnUrl=%2Fpredict%3Ffrom%3Dguard');
    fixture.detectChanges();

    const loginComponent = getLoginComponent(fixture);
    loginComponent.startLogin();

    expect(authServiceMock.startGoogleLogin).toHaveBeenCalledWith('/predict?from=guard');
  });

  it('falls back to /predict when returnUrl is unsafe', async () => {
    authServiceMock.getSession.mockReturnValue(of({ authenticated: false }));

    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(ShellComponent);

    await router.navigateByUrl('/login?returnUrl=https://evil.example/steal');
    fixture.detectChanges();

    const loginComponent = getLoginComponent(fixture);
    loginComponent.startLogin();

    expect(authServiceMock.startGoogleLogin).toHaveBeenCalledWith('/predict');
  });

  it('navigates to returnUrl when session is already authenticated', async () => {
    authServiceMock.getSession.mockReturnValue(of({ authenticated: true }));

    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(ShellComponent);

    await router.navigateByUrl('/login?returnUrl=%2Fpredict%3Ffrom%3Dguard');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(router.url).toBe('/predict?from=guard');
  });

  it('shows temporary session failure message on network error (status 0)', async () => {
    authServiceMock.getSession.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Network Error' }))
    );

    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(ShellComponent);

    await router.navigateByUrl('/login');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const errorText = (fixture.nativeElement as HTMLElement).querySelector('.message-error')?.textContent;
    expect(errorText).toContain('Session check failed temporarily. Please try logging in again.');
  });
});
