import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Match } from '../core/models/match.model';
import { AuthService } from '../core/services/auth.service';
import { MatchesService } from '../core/services/matches.service';
import { PredictionService } from '../core/services/prediction.service';
import { PredictionComponent } from '../pages/prediction/prediction.component';

@Component({
  standalone: true,
  template: '<p>Login</p>'
})
class LoginStubComponent {}

describe('Integration: prediction auth-expiration UI', () => {
  const authServiceMock = {
    getSession: vi.fn(),
    logout: vi.fn(),
    startGoogleLogin: vi.fn()
  };

  const matchesServiceMock = {
    getMatches: vi.fn()
  };

  const predictionServiceMock = {
    predict: vi.fn()
  };

  const availableMatch: Match = {
    homeTeam: 'Mexico',
    awayTeam: 'Brazil',
    matchStage: 'Group Stage',
    venue: 'Test Stadium',
    matchDate: '2099-07-21T18:00:00.000Z'
  };

  beforeEach(async () => {
    authServiceMock.getSession.mockReset();
    authServiceMock.logout.mockReset();
    authServiceMock.startGoogleLogin.mockReset();
    matchesServiceMock.getMatches.mockReset();
    predictionServiceMock.predict.mockReset();

    authServiceMock.getSession.mockReturnValue(of({ authenticated: true }));
    matchesServiceMock.getMatches.mockReturnValue(of([availableMatch]));

    await TestBed.configureTestingModule({
      imports: [PredictionComponent],
      providers: [
        provideRouter([{ path: 'login', component: LoginStubComponent }]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: MatchesService, useValue: matchesServiceMock },
        { provide: PredictionService, useValue: predictionServiceMock }
      ]
    }).compileComponents();
  });

  async function createReadyFixture(): Promise<ComponentFixture<PredictionComponent>> {
    const fixture = TestBed.createComponent(PredictionComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  async function assertSessionExpiredFlow(httpStatus: 401 | 403): Promise<void> {
    predictionServiceMock.predict.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: httpStatus, statusText: 'Auth error' }))
    );

    const fixture = await createReadyFixture();
    const component = fixture.componentInstance;

    component.predictionForm.controls.matchIndex.setValue('0');
    component.onSubmit();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.requiresLogin).toBe(true);
    expect(component.isAuthenticated).toBe(false);
    expect(component.predictionError).toBe('Your session expired or is not authenticated. Please log in again.');

    const loginLink = fixture.nativeElement.querySelector('a.login-link') as HTMLAnchorElement | null;
    expect(loginLink).toBeTruthy();
    expect(loginLink?.getAttribute('href')).toContain('/login');
  }

  it('shows login link and requiresLogin state after 401 in prediction request', async () => {
    await assertSessionExpiredFlow(401);
  });

  it('shows login link and requiresLogin state after 403 in prediction request', async () => {
    await assertSessionExpiredFlow(403);
  });
});
