import { TestBed } from '@angular/core/testing';
import { GuardResult, provideRouter, Router, UrlTree } from '@angular/router';
import { firstValueFrom, isObservable, of, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const authServiceMock = {
    getSession: vi.fn()
  };

  beforeEach(() => {
    authServiceMock.getSession.mockReset();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: authServiceMock
        }
      ]
    });
  });

  async function runGuard(url: string): Promise<GuardResult> {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url } as never)
    );

    if (isObservable(result)) {
      return firstValueFrom(result);
    }

    return result;
  }

  it('allows navigation when session is authenticated', async () => {
    authServiceMock.getSession.mockReturnValue(of({ authenticated: true }));

    const result = await runGuard('/predict');

    expect(result).toBe(true);
  });

  it('redirects to login when session is not authenticated', async () => {
    authServiceMock.getSession.mockReturnValue(of({ authenticated: false }));

    const result = await runGuard('/predict');
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fpredict');
  });

  it('redirects to login when session check fails', async () => {
    authServiceMock.getSession.mockReturnValue(
      throwError(() => new Error('session unavailable'))
    );

    const result = await runGuard('/predict');
    const router = TestBed.inject(Router);

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fpredict');
  });
});
