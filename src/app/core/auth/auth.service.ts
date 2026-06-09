import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { map, tap } from 'rxjs';

const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      rol
      usuario {
        id
        nombre
        email
      }
    }
  }
`;

const TOKEN_KEY = 'ms1_token';
const ROL_KEY = 'ms1_rol';
const NAME_KEY = 'ms1_name';
const EMAIL_KEY = 'ms1_email';
const ID_KEY = 'ms1_id';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apollo = inject(Apollo);
  private router = inject(Router);

  // Signal reactiva del rol actual (para mostrar/ocultar menus).
  readonly rolActual = signal<string | null>(this.rol);

  login(email: string, password: string) {
    return this.apollo
      .mutate<{ login: { token: string; rol: string; usuario: { id: string; nombre: string; email: string } } }>({
        mutation: LOGIN,
        variables: { email, password },
      })
      .pipe(
        map((res) => res.data!.login),
        tap((login) => {
          localStorage.setItem(TOKEN_KEY, login.token);
          localStorage.setItem(ROL_KEY, login.rol);
          localStorage.setItem(NAME_KEY, login.usuario.nombre);
          localStorage.setItem(EMAIL_KEY, login.usuario.email ?? '');
          localStorage.setItem(ID_KEY, String(login.usuario.id ?? ''));
          this.rolActual.set(login.rol);
        }),
      );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROL_KEY);
    localStorage.removeItem(NAME_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(ID_KEY);
    this.rolActual.set(null);
    this.router.navigate(['/login']);
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
  get rol(): string | null {
    return localStorage.getItem(ROL_KEY);
  }
  get nombre(): string | null {
    return localStorage.getItem(NAME_KEY);
  }
  get email(): string | null {
    return localStorage.getItem(EMAIL_KEY);
  }
  get userId(): string | null {
    return localStorage.getItem(ID_KEY);
  }
  get isAuthenticated(): boolean {
    return !!this.token;
  }
}
