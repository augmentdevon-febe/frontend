import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
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

describe('Integration: prediction logout flow', () => {
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

  it('shows logging out state and starts auth cycle again after successful logout', async () => {
    const logoutSubject = new Subject<void>();
    authServiceMock.logout.mockReturnValue(logoutSubject.asObservable());

    const fixture = await createReadyFixture();
    const component = fixture.componentInstance;

    const logoffButton = fixture.nativeElement.querySelector('button.logoff-button') as HTMLButtonElement;
    expect(logoffButton).toBeTruthy();

    logoffButton.click();
    fixture.detectChanges();

    expect(component.isLoggingOut).toBe(true);
    expect(authServiceMock.logout).toHaveBeenCalledTimes(1);
    expect(logoffButton.disabled).toBe(true);
    expect(logoffButton.textContent).toContain('Logging off...');

    logoutSubject.next();
    logoutSubject.complete();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isLoggingOut).toBe(false);
    expect(authServiceMock.startGoogleLogin).toHaveBeenCalledTimes(1);
  });

  it('restarts auth cycle even when logout fails', async () => {
    const logoutSubject = new Subject<void>();
    authServiceMock.logout.mockReturnValue(logoutSubject.asObservable());

    const fixture = await createReadyFixture();
    const component = fixture.componentInstance;

    component.logOff();
    fixture.detectChanges();
    expect(component.isLoggingOut).toBe(true);

    logoutSubject.error(new Error('logout failed'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isLoggingOut).toBe(false);
    expect(authServiceMock.startGoogleLogin).toHaveBeenCalledTimes(1);
  });

  it('prevents duplicate logout calls while a logout request is in progress', async () => {
    const logoutSubject = new Subject<void>();
    authServiceMock.logout.mockReturnValue(logoutSubject.asObservable());

    const fixture = await createReadyFixture();
    const component = fixture.componentInstance;

    component.logOff();
    component.logOff();

    expect(authServiceMock.logout).toHaveBeenCalledTimes(1);

    logoutSubject.complete();
  });
});
