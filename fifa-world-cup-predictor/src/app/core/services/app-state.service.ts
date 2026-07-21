import { Injectable, signal } from '@angular/core';
import { Match } from '../models/match.model';
import { PredictionResponse } from '../models/prediction-response.model';

/**
 * Service objective:
 * - Keep a single shared state for auth, login, matches, and prediction flows.
 * - Reduce duplicated state and coupling across components.
 *
 * Primary responsibility:
 * - Expose read-only signals plus explicit mutators for traceable transitions.
 *
 * Shared UI/application state for auth, login, matches and prediction flows.
 *
 * Design notes:
 * - Private writable signals (_*) are the single source of truth.
 * - Public read-only signals (*Sig) are consumed by components.
 * - Mutations are explicit through setter methods to keep state transitions traceable.
 */
@Injectable({
  providedIn: 'root'
})
export class AppStateService {
  /** Current list of match options available for prediction. */
  private readonly _matches = signal<Match[]>([]);

  /** Last prediction response shown in UI, or null when no prediction is selected/rendered. */
  private readonly _prediction = signal<PredictionResponse | null>(null);

  /** True while the app is loading matches from backend. */
  private readonly _isLoadingMatches = signal(true);

  /** True while the app is checking auth state for the prediction page. */
  private readonly _isCheckingAuth = signal(true);

  /** True while prediction request is in-flight. */
  private readonly _isPredicting = signal(false);

  /** True while logout request is in-flight. */
  private readonly _isLoggingOut = signal(false);

  /** True when there is an active authenticated session. */
  private readonly _isAuthenticated = signal(false);

  /** User-facing status message for auth checks on prediction page. */
  private readonly _authStatusMessage = signal('Checking your authentication status...');

  /** User-facing error shown when match loading fails. */
  private readonly _matchesError = signal('');

  /** User-facing form validation message for prediction form. */
  private readonly _formError = signal('');

  /** User-facing error shown when prediction request fails. */
  private readonly _predictionError = signal('');

  /** True when prediction page should force user back to login flow. */
  private readonly _requiresLogin = signal(false);

  /** True while login page is checking existing session. */
  private readonly _isCheckingSession = signal(false);

  /** True while login button flow is in progress. */
  private readonly _isLoginInProgress = signal(false);

  /** User-facing error shown on login page. */
  private readonly _loginError = signal('');

  /** Read-only stream for available matches. */
  readonly matchesSig = this._matches.asReadonly();

  /** Read-only stream for current prediction payload rendered in UI. */
  readonly predictionSig = this._prediction.asReadonly();

  /** Read-only loading flag for matches request. */
  readonly isLoadingMatchesSig = this._isLoadingMatches.asReadonly();

  /** Read-only loading flag for auth check in prediction page. */
  readonly isCheckingAuthSig = this._isCheckingAuth.asReadonly();

  /** Read-only loading flag for prediction submit. */
  readonly isPredictingSig = this._isPredicting.asReadonly();

  /** Read-only loading flag for logout action. */
  readonly isLoggingOutSig = this._isLoggingOut.asReadonly();

  /** Read-only flag for current authenticated session state. */
  readonly isAuthenticatedSig = this._isAuthenticated.asReadonly();

  /** Read-only status message for auth checks. */
  readonly authStatusMessageSig = this._authStatusMessage.asReadonly();

  /** Read-only message for matches loading errors. */
  readonly matchesErrorSig = this._matchesError.asReadonly();

  /** Read-only message for form validation errors in prediction page. */
  readonly formErrorSig = this._formError.asReadonly();

  /** Read-only message for prediction request errors. */
  readonly predictionErrorSig = this._predictionError.asReadonly();

  /** Read-only flag indicating login is required before predicting again. */
  readonly requiresLoginSig = this._requiresLogin.asReadonly();

  /** Read-only loading flag for login page session check. */
  readonly isCheckingSessionSig = this._isCheckingSession.asReadonly();

  /** Read-only loading flag for login flow progress. */
  readonly isLoginInProgressSig = this._isLoginInProgress.asReadonly();

  /** Read-only login page error message. */
  readonly loginErrorSig = this._loginError.asReadonly();

  /** Replaces the full list of matches in state. */
  setMatches(matches: Match[]): void {
    this._matches.set(matches);
  }

  /** Stores or clears current prediction result rendered in UI. */
  setPrediction(prediction: PredictionResponse | null): void {
    this._prediction.set(prediction);
  }

  /** Sets loading flag for matches request lifecycle. */
  setIsLoadingMatches(value: boolean): void {
    this._isLoadingMatches.set(value);
  }

  /** Sets loading flag for auth check lifecycle on prediction page. */
  setIsCheckingAuth(value: boolean): void {
    this._isCheckingAuth.set(value);
  }

  /** Sets loading flag for prediction request lifecycle. */
  setIsPredicting(value: boolean): void {
    this._isPredicting.set(value);
  }

  /** Sets loading flag for logout lifecycle. */
  setIsLoggingOut(value: boolean): void {
    this._isLoggingOut.set(value);
  }

  /** Updates global authenticated-session flag. */
  setIsAuthenticated(value: boolean): void {
    this._isAuthenticated.set(value);
  }

  /** Updates auth status helper text shown in prediction page. */
  setAuthStatusMessage(message: string): void {
    this._authStatusMessage.set(message);
  }

  /** Updates error text for matches-loading failures. */
  setMatchesError(error: string): void {
    this._matchesError.set(error);
  }

  /** Updates validation error text for prediction form. */
  setFormError(error: string): void {
    this._formError.set(error);
  }

  /** Updates error text for prediction-submit failures. */
  setPredictionError(error: string): void {
    this._predictionError.set(error);
  }

  /** Sets flag to drive login-required fallback in prediction page. */
  setRequiresLogin(value: boolean): void {
    this._requiresLogin.set(value);
  }

  /** Sets loading flag for login page session bootstrap check. */
  setIsCheckingSession(value: boolean): void {
    this._isCheckingSession.set(value);
  }

  /** Sets loading flag for explicit login trigger flow. */
  setIsLoginInProgress(value: boolean): void {
    this._isLoginInProgress.set(value);
  }

  /** Updates login page error text. */
  setLoginError(error: string): void {
    this._loginError.set(error);
  }
}
