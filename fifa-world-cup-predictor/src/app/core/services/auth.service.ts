import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private readonly loginUrl = 'http://localhost:8080/api/auth/login';
  private readonly sessionUrl = '/api/auth/session';
  private readonly logoutUrl = '/api/auth/logout';

  constructor(private readonly http: HttpClient) {}

  startGoogleLogin(): void {
    const loginRedirect = `${window.location.origin}/login`;
    const url = new URL(this.loginUrl);

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
