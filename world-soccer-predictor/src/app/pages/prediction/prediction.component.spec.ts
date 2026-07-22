import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { Match } from '../../core/models/match.model';
import { PredictionResponse } from '../../core/models/prediction-response.model';
import { AuthService } from '../../core/services/auth.service';
import { MatchesService } from '../../core/services/matches.service';
import { PredictionService } from '../../core/services/prediction.service';
import { PredictionComponent } from './prediction.component';

describe('PredictionComponent', () => {
  const authenticatedSession = { authenticated: true };
  const futureMatch: Match = {
    identifier: 'liga_mx_invierno_2026',
    homeTeam: 'Club America',
    awayTeam: 'Monterrey',
    matchStage: 'Quarterfinal',
    venue: 'Estadio Azteca',
    matchDate: '2099-07-20T19:00:00Z'
  };

  let matchesResponse$: Observable<Match[]>;
  let authServiceMock: {
    getSession: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    startGoogleLogin: ReturnType<typeof vi.fn>;
  };
  let matchesServiceMock: {
    getMatches: ReturnType<typeof vi.fn>;
  };
  let predictionServiceMock: {
    predict: ReturnType<typeof vi.fn>;
  };

  const createComponent = () => {
    const fixture = TestBed.createComponent(PredictionComponent);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(async () => {
    authServiceMock = {
      getSession: vi.fn(),
      logout: vi.fn(),
      startGoogleLogin: vi.fn()
    };
    matchesServiceMock = {
      getMatches: vi.fn()
    };
    predictionServiceMock = {
      predict: vi.fn()
    };

    authServiceMock.getSession.mockReturnValue(of(authenticatedSession));
    authServiceMock.logout.mockReturnValue(of(void 0));
    matchesServiceMock.getMatches.mockImplementation(() => matchesResponse$);
    predictionServiceMock.predict.mockReturnValue(of({} as PredictionResponse));

    await TestBed.configureTestingModule({
      imports: [PredictionComponent],
      providers: [
        FormBuilder,
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock as unknown as AuthService },
        { provide: MatchesService, useValue: matchesServiceMock as unknown as MatchesService },
        {
          provide: PredictionService,
          useValue: predictionServiceMock as unknown as PredictionService
        }
      ]
    }).compileComponents();
  });

  it('shows loading state while matches are still in-flight', () => {
    const pendingMatches$ = new Subject<Match[]>();
    matchesResponse$ = pendingMatches$.asObservable();

    const fixture = createComponent();
    const component = fixture.componentInstance;
    const html = fixture.nativeElement as HTMLElement;

    expect(component.isLoadingMatches).toBe(true);
    expect(html.textContent).toContain('Loading matches from backend...');
  });

  it('loads matches successfully and keeps dropdown UX available', () => {
    matchesResponse$ = of([futureMatch]);

    const fixture = createComponent();
    const component = fixture.componentInstance;
    const html = fixture.nativeElement as HTMLElement;

    expect(component.isLoadingMatches).toBe(false);
    expect(component.matchesError).toBe('');
    expect(component.hasPredictableMatch).toBe(true);
    expect(component.matches.length).toBe(1);
    expect(html.querySelector('form.prediction-form')).toBeTruthy();
  });

  it('shows empty state when API returns no matches', () => {
    matchesResponse$ = of([]);

    const fixture = createComponent();
    const component = fixture.componentInstance;
    const html = fixture.nativeElement as HTMLElement;

    expect(component.isLoadingMatches).toBe(false);
    expect(component.matches.length).toBe(0);
    expect(component.matchesError).toBe('');
    expect(html.textContent).toContain('No upcoming matches available right now. Please check back later.');
  });

  it('maps match loading errors by status code', () => {
    const cases: Array<{ status: number; expected: string; requiresLogin?: boolean }> = [
      {
        status: 400,
        expected: 'The match request is invalid. Please refresh and try again.'
      },
      {
        status: 401,
        expected: 'Your session expired. Please log in again to load matches.',
        requiresLogin: true
      },
      {
        status: 403,
        expected: 'You do not have permission to view matches.'
      },
      {
        status: 429,
        expected: 'Too many requests. Please wait a moment and try again.'
      },
      {
        status: 500,
        expected: 'Match service is temporarily unavailable. Please try again later.'
      },
      {
        status: 503,
        expected: 'Match service is temporarily unavailable. Please try again later.'
      }
    ];

    for (const testCase of cases) {
      matchesResponse$ = throwError(
        () =>
          new HttpErrorResponse({
            status: testCase.status,
            error: {
              error: {
                code: 'INTERNAL_ERROR',
                message: 'Backend message',
                details: []
              },
              timestamp: '2026-07-20T00:00:00Z',
              path: '/api/matches'
            }
          })
      );

      const fixture = createComponent();
      const component = fixture.componentInstance;

      expect(component.matchesError).toBe(testCase.expected);
      expect(component.requiresLogin).toBe(!!testCase.requiresLogin);
      fixture.destroy();
    }
  });
});
