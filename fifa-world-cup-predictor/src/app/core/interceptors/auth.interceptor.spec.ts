import { TestBed } from '@angular/core/testing';
import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  const routerMock = {
    url: '/predict',
    navigate: vi.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    routerMock.url = '/predict';
    routerMock.navigate.mockClear();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: routerMock
        }
      ]
    });
  });

  it('adds withCredentials for /api requests', async () => {
    const request = new HttpRequest('GET', '/api/matches');
    let capturedWithCredentials = false;
    const next = ((req: HttpRequest<unknown>) => {
      capturedWithCredentials = req.withCredentials;
      return of(new HttpResponse({ status: 200, body: [] }));
    }) as HttpHandlerFn;

    await firstValueFrom(
      TestBed.runInInjectionContext(() => authInterceptor(request, next))
    );

    expect(capturedWithCredentials).toBe(true);
  });

  it('does not add withCredentials for non-api requests', async () => {
    const request = new HttpRequest('GET', 'https://example.com/public.json');
    let capturedWithCredentials = true;
    const next = ((req: HttpRequest<unknown>) => {
      capturedWithCredentials = req.withCredentials;
      return of(new HttpResponse({ status: 200, body: {} }));
    }) as HttpHandlerFn;

    await firstValueFrom(
      TestBed.runInInjectionContext(() => authInterceptor(request, next))
    );

    expect(capturedWithCredentials).toBe(false);
  });

  it('adds withCredentials for absolute API URLs', async () => {
    const request = new HttpRequest('GET', 'https://backend.example.com/api/matches');
    let capturedWithCredentials = false;
    const next = ((req: HttpRequest<unknown>) => {
      capturedWithCredentials = req.withCredentials;
      return of(new HttpResponse({ status: 200, body: [] }));
    }) as HttpHandlerFn;

    await firstValueFrom(
      TestBed.runInInjectionContext(() => authInterceptor(request, next))
    );

    expect(capturedWithCredentials).toBe(true);
  });

  it('navigates to login on 401 for api requests', async () => {
    const request = new HttpRequest('GET', '/api/auth/session');
    const next: HttpHandlerFn = () =>
      throwError(() => new HttpErrorResponse({ status: 401 }));

    await expect(
      firstValueFrom(TestBed.runInInjectionContext(() => authInterceptor(request, next)))
    ).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(routerMock.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/predict' }
    });
  });

  it('does not navigate on 401 when already in login', async () => {
    routerMock.url = '/login';
    const request = new HttpRequest('GET', '/api/auth/session');
    const next: HttpHandlerFn = () =>
      throwError(() => new HttpErrorResponse({ status: 401 }));

    await expect(
      firstValueFrom(TestBed.runInInjectionContext(() => authInterceptor(request, next)))
    ).rejects.toBeInstanceOf(HttpErrorResponse);

    expect(routerMock.navigate).not.toHaveBeenCalled();
  });
});
