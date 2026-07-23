import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { buildApiUrl } from './api-url';

export interface AuthSessionResponse {
  subject?: string;
  email?: string;
  name?: string;
  authenticated: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly loginUrl = buildApiUrl('/api/auth/login');
  private readonly switchAccountUrl = buildApiUrl('/api/auth/switch-account');
  private readonly sessionUrl = buildApiUrl('/api/auth/session');
  private readonly logoutUrl = buildApiUrl('/api/auth/logout');

  constructor(private readonly http: HttpClient) {}

  loginWithGoogle(): void {
    window.location.assign(this.buildGoogleLoginUrl());
  }

  buildGoogleLoginUrl(): string {
    const loginRedirect = this.buildPredictRedirectUrl();
    const url = new URL(this.loginUrl, window.location.origin);

    url.searchParams.set('redirect_uri', loginRedirect);

    return url.toString();
  }

  switchGoogleAccount(): void {
    window.location.assign(this.buildSwitchGoogleAccountUrl());
  }

  buildSwitchGoogleAccountUrl(): string {
    const loginRedirect = this.buildPredictRedirectUrl();
    const url = new URL(this.switchAccountUrl, window.location.origin);

    url.searchParams.set('redirect_uri', loginRedirect);

    return url.toString();
  }

  private buildPredictRedirectUrl(): string {
    return `${window.location.origin}/predict`;
  }

  getSession(): Observable<AuthSessionResponse> {
    return this.http.get<AuthSessionResponse>(this.sessionUrl, {
      withCredentials: true
    });
  }

  logout(): Observable<void> {
    return this.http.post<void>(this.logoutUrl, {}, {
      withCredentials: true
    });
  }
}
