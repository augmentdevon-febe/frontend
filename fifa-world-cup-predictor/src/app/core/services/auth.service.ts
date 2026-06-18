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

  constructor(private readonly http: HttpClient) {}

  startGoogleLoginPopup(): Window | null {
    return window.open(
      this.loginUrl,
      'google-login',
      'width=520,height=700,left=100,top=100'
    );
  }

  startGoogleLogin(): void {
    window.location.href = this.loginUrl;
  }

  getSession(): Observable<AuthSessionResponse> {
    return this.http.get<AuthSessionResponse>(this.sessionUrl, {
      withCredentials: true
    });
  }

  getSessionCookie(): string {
    const sessionCookie = document.cookie;
    return sessionCookie;
  }
}
