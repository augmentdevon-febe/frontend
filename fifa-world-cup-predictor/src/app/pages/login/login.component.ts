import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { AppStateService } from '../../core/services/app-state.service';
import { UiMessageService } from '../../core/services/ui-message.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
/**
 * Component objective:
 * - Serve as the user's authentication entry point.
 * - Verify existing session state when the view loads.
 * - Start the external login flow while preserving a safe returnUrl.
 *
 * Primary responsibility:
 * - Orchestrate login UX state (loading/errors) and navigation to prediction.
 */
export class LoginComponent implements OnInit {
  private isSessionRequestInFlight = false;

  constructor(
    private readonly appState: AppStateService,
    private readonly authService: AuthService,
    private readonly uiMessages: UiMessageService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {}

  get isCheckingSession(): boolean {
    return this.appState.isCheckingSessionSig();
  }

  set isCheckingSession(value: boolean) {
    this.appState.setIsCheckingSession(value);
  }

  get isLoginInProgress(): boolean {
    return this.appState.isLoginInProgressSig();
  }

  set isLoginInProgress(value: boolean) {
    this.appState.setIsLoginInProgress(value);
  }

  get loginError(): string {
    return this.appState.loginErrorSig();
  }

  set loginError(value: string) {
    this.appState.setLoginError(value);
  }

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
    this.authService.startGoogleLogin(this.getSafeReturnPath());
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
          this.appState.setIsAuthenticated(true);
          this.isLoginInProgress = false;
          this.router.navigateByUrl(this.getSafeReturnPath());
          return;
        }

        this.appState.setIsAuthenticated(false);

        if (!this.isLoginInProgress) {
          this.loginError = this.uiMessages.messages.login.required;
        }
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && [401, 403].includes(error.status)) {
          this.appState.setIsAuthenticated(false);
        }
        this.isLoginInProgress = false;
        this.loginError = this.uiMessages.mapLoginSessionCheckError(error);
      }
    });
  }

  private getSafeReturnPath(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/predict';

    if (!returnUrl.startsWith('/') || returnUrl.startsWith('//')) {
      return '/predict';
    }

    return returnUrl;
  }
}
