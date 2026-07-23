import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService, AuthSessionResponse } from '../../core/services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let getSessionMock: ReturnType<typeof vi.fn>;
  let loginWithGoogleMock: ReturnType<typeof vi.fn>;
  let navigateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getSessionMock = vi.fn();
    loginWithGoogleMock = vi.fn();
    navigateMock = vi.fn();

    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            getSession: getSessionMock,
            loginWithGoogle: loginWithGoogleMock
          }
        },
        {
          provide: Router,
          useValue: {
            navigate: navigateMock
          }
        }
      ]
    });
  });

  it('re-enables login action when session check returns unauthenticated', () => {
    const unauthenticatedSession: AuthSessionResponse = { authenticated: false };
    getSessionMock.mockReturnValue(of(unauthenticatedSession));

    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    component.isLoginInProgress = true;

    fixture.detectChanges();

    expect(component.isLoginInProgress).toBe(false);
    expect(component.loginError).toContain('Please log in with Google to continue.');
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('resets stale login-in-progress state when page is restored from bfcache', () => {
    const unauthenticatedSession: AuthSessionResponse = { authenticated: false };
    getSessionMock.mockReturnValue(of(unauthenticatedSession));

    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    getSessionMock.mockClear();
    component.isLoginInProgress = true;

    component.onPageShow({ persisted: true } as PageTransitionEvent);

    expect(component.isLoginInProgress).toBe(false);
    expect(getSessionMock).toHaveBeenCalledTimes(1);
  });

  it('keeps login enabled when unauthenticated backend responds with 401', () => {
    getSessionMock.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 401,
            error: {
              error: {
                code: 'UNAUTHORIZED',
                message: 'Unauthorized'
              }
            }
          })
      )
    );

    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    component.isLoginInProgress = true;

    fixture.detectChanges();

    expect(component.isLoginInProgress).toBe(false);
    expect(component.loginError).toContain('Please log in with Google to continue.');
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
