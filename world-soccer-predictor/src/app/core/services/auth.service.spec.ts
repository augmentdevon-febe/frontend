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

  it('builds a Google login URL that returns to the predict page', () => {
    const redirectUrl = new URL(service.buildGoogleLoginUrl());
    const expectedReturnUrl = `${window.location.origin}/predict`;

    expect(redirectUrl.pathname).toBe('/api/auth/login');
    expect(redirectUrl.searchParams.get('redirect_uri')).toBe(expectedReturnUrl);
  });

  it('builds a switch-account URL that returns to the predict page', () => {
    const redirectUrl = new URL(service.buildSwitchGoogleAccountUrl());
    const expectedReturnUrl = `${window.location.origin}/predict`;

    expect(redirectUrl.pathname).toBe('/api/auth/switch-account');
    expect(redirectUrl.searchParams.get('redirect_uri')).toBe(expectedReturnUrl);
  });
});