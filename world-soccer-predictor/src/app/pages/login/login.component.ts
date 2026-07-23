import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { appProperties } from '../../core/config/app-properties';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
// Handles same-tab Google login redirect, session checks, and navigation to prediction page.
export class LoginComponent implements OnInit {
  readonly branding = appProperties;
  isCheckingSession = false;
  isLoginInProgress = false;
  loginError = '';

  // Centralized user-facing messages used across login flow.
  readonly pageMessages = [
    'Please log in with Google to continue.',
    'Session check failed temporarily. Please try logging in again.',
    'Session check timed out or failed. Click Login to continue to Google Login page.'
  ] as const;

  private readonly messageIndex = {
    loginRequired: 0,
    temporarySessionFailure: 1,
    sessionCheckFailed: 2
  } as const;

  private isSessionRequestInFlight = false;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  // Performs an initial session check on page load to skip login when already authenticated.
  ngOnInit(): void {
    this.checkSessionAndNavigate(false);
  }

  // Resets loading state when leaving the login page.
  ngOnDestroy(): void {
    this.isLoginInProgress = false;
  }

  // Starts same-tab Google login redirect.
  startLogin(): void {
    this.loginError = '';
    this.isLoginInProgress = true;
    this.authService.loginWithGoogle();
  }

  startSwitchAccount(): void {
    this.loginError = '';
    this.isLoginInProgress = true;
    this.authService.switchGoogleAccount();
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
          this.isLoginInProgress = false;
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
          this.isLoginInProgress = false;
          this.loginError = this.pageMessages[this.messageIndex.loginRequired];
          return;
        }

        if (error instanceof HttpErrorResponse && error.status === 0) {
          this.isLoginInProgress = false;
          this.loginError = this.pageMessages[this.messageIndex.temporarySessionFailure];
          return;
        }

        this.isLoginInProgress = false;
        this.loginError = this.pageMessages[this.messageIndex.sessionCheckFailed];
      }
    });
  }
}
