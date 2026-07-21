import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface PredictionMessageSet {
  sessionExpired: string;
  predictionFailed: string;
  unexpectedError: string;
}

/**
 * Service objective:
 * - Centralize UI messages for login, session, and prediction flows.
 * - Standardize mapping from technical errors to user-facing messages.
 *
 * Primary responsibility:
 * - Avoid duplicated copy and keep UX messaging consistent across components.
 */
@Injectable({
  providedIn: 'root'
})
export class UiMessageService {
  readonly messages = {
    login: {
      required: 'Please log in with Google to continue.',
      temporarySessionFailure: 'Session check failed temporarily. Please try logging in again.',
      sessionCheckFailed:
        'Session check timed out or failed. Click Login to continue to Google Login page.'
    },
    prediction: {
      checkingAuth: 'Checking your authentication status...',
      noAuthSession: 'No active authenticated session. Please log in again.',
      sessionCheckFailed:
        'Unable to verify session right now. You can still try predicting; backend auth will be enforced.',
      loadingMatches: 'Loading matches from backend...',
      matchesLoadError: 'Unable to load World Cup matches right now. Please refresh and try again.',
      noUpcomingMatches: 'No upcoming matches available right now. Please check back later.',
      selectMatchError: 'Please select a match before predicting.',
      invalidMatchError: 'The selected match is invalid. Please choose another one.',
      sessionExpired: 'Your session expired or is not authenticated. Please log in again.',
      predictionFailed: 'Prediction request failed. Please try again in a moment.',
      unexpectedError: 'An unexpected error occurred while predicting the match.',
      runningSimulation: 'Running simulation...'
    }
  } as const;

  mapLoginSessionCheckError(error: unknown): string {
    if (error instanceof HttpErrorResponse && [401, 403].includes(error.status)) {
      return this.messages.login.required;
    }

    if (error instanceof HttpErrorResponse && error.status === 0) {
      return this.messages.login.temporarySessionFailure;
    }

    return this.messages.login.sessionCheckFailed;
  }

  predictionErrorSet(): PredictionMessageSet {
    return {
      sessionExpired: this.messages.prediction.sessionExpired,
      predictionFailed: this.messages.prediction.predictionFailed,
      unexpectedError: this.messages.prediction.unexpectedError
    };
  }
}
