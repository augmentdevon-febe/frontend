import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
// Handles Google login popup flow, session polling, and navigation to prediction page.
export class LoginComponent implements OnInit {
  isCheckingSession = false;
  isLoginInProgress = false;
  loginError = '';

  // Centralized user-facing messages used across login flow.
  readonly pageMessages = [
    'Popup was blocked by the browser. Please allow popups and try again.',
    'Please log in with Google to continue.',
    'Session check failed temporarily. If login completed, closing the popup will continue to prediction.',
    'Session check timed out or failed. Click in Login to go to Google Login page.'
  ] as const;

  private readonly messageIndex = {
    popupBlocked: 0,
    loginRequired: 1,
    temporarySessionFailure: 2,
    sessionCheckFailed: 3
  } as const;

  private isSessionRequestInFlight = false;
  private pollTimerId: number | null = null;
  private loginPopup: Window | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  // Performs an initial session check on page load to skip login when already authenticated.
  ngOnInit(): void {
    this.checkSessionAndNavigate(false);
  }

  // Stops any active polling when leaving the login page.
  ngOnDestroy(): void {
    this.stopPolling();
    this.isLoginInProgress = false;
  }

  // Starts popup-based login and enables periodic session checks.
  startLogin(): void {
    this.loginError = '';

    this.loginPopup = this.authService.startGoogleLoginPopup();
    if (!this.loginPopup) {
      this.loginError = this.pageMessages[this.messageIndex.popupBlocked];
      return;
    }

    this.isLoginInProgress = true;
    this.isCheckingSession = true;
    this.startPollingSession();
  }

  // Queries backend session state and routes to prediction page when authenticated.
  private checkSessionAndNavigate(showLoading: boolean): void {
    if (this.isSessionRequestInFlight) {
      return;
    }

    this.isSessionRequestInFlight = true;
    if (showLoading) {
      this.isCheckingSession = true;
    }

    // The session check is wrapped in a timeout to avoid indefinite waiting for a response.
    this.authService
      .getSession()
      .pipe(
        timeout(4500),
        finalize(() => {
          this.isSessionRequestInFlight = false;
          if (showLoading) {
            this.isCheckingSession = false;
          }
        })
      )
      .subscribe({
      next: (session) => {
        if (session.authenticated) {
          if (this.loginPopup && !this.loginPopup.closed) {
            this.loginPopup.close();
          }

          this.isLoginInProgress = false;
          this.stopPolling();
          this.router.navigate(['/predict']);
          return;
        }

        if (!this.isLoginInProgress) {
          this.loginError = this.pageMessages[this.messageIndex.loginRequired];
        }
      },
      error: (error: unknown) => {
        // Handle specific HTTP errors that indicate unauthenticated state without showing generic error messages.  
        // Allowing the UI to prompt for login without alarming users 
        // with technical error details when they are not logged in.
        if (error instanceof HttpErrorResponse && [401, 403].includes(error.status)) {
          if (this.loginPopup && !this.loginPopup.closed) {
            return;
          }

          this.isLoginInProgress = false;
          this.loginError = this.pageMessages[this.messageIndex.loginRequired];
          return;
        }

        if (error instanceof HttpErrorResponse && error.status === 0) {
          if (this.loginPopup && this.loginPopup.closed) {
            this.isLoginInProgress = false;
          }

          this.loginError = this.pageMessages[this.messageIndex.temporarySessionFailure];
          return;
        }

        if (this.loginPopup && this.loginPopup.closed) {
          this.isLoginInProgress = false;
        }

        this.loginError = this.pageMessages[this.messageIndex.sessionCheckFailed];
      }
    });
  }

  // Polls for popup closure and fresh session status while login is in progress.
  private startPollingSession(): void {
    this.stopPolling();
    this.pollTimerId = window.setInterval(() => {
      if (this.loginPopup && this.loginPopup.closed) {
        this.loginPopup = null;
        this.isLoginInProgress = false;
        this.stopPolling();
        this.checkSessionAndNavigate(true);
        return;
      }

      this.checkSessionAndNavigate(true);
    }, 1200);
  }

  // Clears polling timer to avoid duplicate intervals and memory leaks.
  private stopPolling(): void {
    if (this.pollTimerId !== null) {
      window.clearInterval(this.pollTimerId);
      this.pollTimerId = null;
    }
  }
}
