import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

function isApiRequest(url: string): boolean {
  if (url.startsWith('/api/')) {
    return true;
  }

  if (url === '/api') {
    return true;
  }

  try {
    const origin = globalThis.location?.origin || 'http://localhost';
    const resolved = new URL(url, origin);
    return resolved.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const shouldAttachCredentials = isApiRequest(request.url);

  const requestWithAuth = shouldAttachCredentials
    ? request.clone({ withCredentials: true })
    : request;

  return next(requestWithAuth).pipe(
    catchError((error: unknown) => {
      if (
        shouldAttachCredentials &&
        error instanceof HttpErrorResponse &&
        (error.status === 401 || error.status === 403)
      ) {
        const currentUrl = router.url || '/';
        if (!currentUrl.startsWith('/login')) {
          void router.navigate(['/login'], {
            queryParams: { returnUrl: currentUrl }
          });
        }
      }

      return throwError(() => error);
    })
  );
};