import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// Restringe rutas solo a ADMIN (usuarios, reportes).
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.rol === 'ADMIN' ? true : router.parseUrl('/dashboard');
};
