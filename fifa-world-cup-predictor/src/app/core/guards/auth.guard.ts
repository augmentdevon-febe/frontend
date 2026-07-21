import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.getSession().pipe(
    map((session) => {
      if (session.authenticated) {
        return true;
      }

      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url }
      });
    }),
    catchError(() => {
      return of(
        router.createUrlTree(['/login'], {
          queryParams: { returnUrl: state.url }
        })
      );
    })
  );
};