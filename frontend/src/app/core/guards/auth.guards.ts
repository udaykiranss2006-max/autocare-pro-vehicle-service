import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Role } from '../models/models';
import { AuthService } from '../services/auth.service';

/**
 * Navigation convenience only. The real authorization boundary is the backend,
 * which checks the token and role on every request.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();
  if (!user) return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  if (user.mustChangePassword && !state.url.startsWith('/change-password')) return router.createUrlTree(['/change-password']);
  const roles = route.data?.['roles'] as Role[] | undefined;
  if (roles && !roles.includes(user.role)) return router.createUrlTree([auth.homeFor(user.role)]);
  return true;
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const user = auth.user();
  return user ? inject(Router).createUrlTree([auth.homeFor(user.role)]) : true;
};
