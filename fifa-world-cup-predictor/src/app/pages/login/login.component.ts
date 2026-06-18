import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  isCheckingSession = false;
  isLoginInProgress = false;
  loginError = '';

  private isSessionRequestInFlight = false;
  private pollTimerId: number | null = null;
  private loginPopup: Window | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.checkSessionAndNavigate(false);
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.isLoginInProgress = false;
  }

  startLogin(): void {
    this.loginError = '';

    this.loginPopup = this.authService.startGoogleLoginPopup();
    if (!this.loginPopup) {
      this.loginError =
        'Popup was blocked by the browser. Please allow popups and try again.';
      return;
    }

    this.isLoginInProgress = true;
    this.isCheckingSession = true;
    this.startPollingSession();
  }

  private checkSessionAndNavigate(showLoading: boolean): void {
    if (this.isSessionRequestInFlight) {
      return;
    }

    this.isSessionRequestInFlight = true;
    if (showLoading) {
      this.isCheckingSession = true;
    }

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
          this.loginError = 'Please log in with Google to continue.';
        }
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && [401, 403].includes(error.status)) {
          if (this.loginPopup && !this.loginPopup.closed) {
            return;
          }

          this.isLoginInProgress = false;
          this.loginError = 'Please log in with Google to continue.';
          return;
        }

        if (error instanceof HttpErrorResponse && error.status === 0) {
          if (this.loginPopup && this.loginPopup.closed) {
            this.isLoginInProgress = false;
          }

          this.loginError =
            'Session check failed temporarily. If login completed, closing the popup will continue to prediction.';
          return;
        }

        if (this.loginPopup && this.loginPopup.closed) {
          this.isLoginInProgress = false;
        }

        this.loginError =
          'Session check timed out or failed. You can click Login with Google again.';
      }
    });
  }

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

  private stopPolling(): void {
    if (this.pollTimerId !== null) {
      window.clearInterval(this.pollTimerId);
      this.pollTimerId = null;
    }
  }
}
