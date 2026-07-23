import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(AuthService);
  });

  it('builds a Google login URL that returns to the login page for session confirmation', () => {
    const redirectUrl = new URL(service.buildGoogleLoginUrl());
    const expectedReturnUrl = `${window.location.origin}/login`;

    expect(redirectUrl.pathname).toBe('/api/auth/login');
    expect(redirectUrl.searchParams.get('redirect_uri')).toBe(expectedReturnUrl);
    expect(redirectUrl.searchParams.get('redirectUrl')).toBe(expectedReturnUrl);
    expect(redirectUrl.searchParams.get('returnUrl')).toBe(expectedReturnUrl);
  });
});