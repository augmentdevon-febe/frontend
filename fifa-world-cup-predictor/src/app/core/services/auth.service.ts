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
  private readonly sessionUrl = buildApiUrl('/api/auth/session');
  private readonly logoutUrl = buildApiUrl('/api/auth/logout');

  constructor(private readonly http: HttpClient) {}

  startGoogleLogin(): void {
    const loginRedirect = `${window.location.origin}/login`;
    const url = new URL(this.loginUrl, window.location.origin);

    url.searchParams.set('redirect_uri', loginRedirect);
    url.searchParams.set('redirectUrl', loginRedirect);
    url.searchParams.set('returnUrl', loginRedirect);

    window.location.assign(url.toString());
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
