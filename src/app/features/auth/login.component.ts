import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-wrap">
      <mat-card class="login-card">
        <div class="brand">
          <span class="brand-mark">C</span>
          <div>
            <div class="brand-name">Courier <b>Inteligente</b></div>
            <div class="brand-sub">Panel administrativo</div>
          </div>
        </div>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Correo</mat-label>
              <input matInput type="email" formControlName="email" placeholder="admin@courier.com" />
            </mat-form-field>
            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Contraseña</mat-label>
              <input matInput type="password" formControlName="password" />
            </mat-form-field>

            @if (error()) {
              <p class="error">{{ error() }}</p>
            }

            <button
              mat-raised-button
              color="primary"
              class="full-width"
              type="submit"
              [disabled]="form.invalid || cargando()"
            >
              @if (cargando()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Iniciar sesión
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .login-wrap {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: radial-gradient(1200px 600px at 50% -10%, #fffdf9, var(--paper));
      }
      .login-card {
        width: 380px;
        padding: 26px 24px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 22px;
      }
      .brand-mark {
        width: 44px;
        height: 44px;
        border-radius: 11px;
        background: var(--ink);
        color: #f4f1ea;
        display: grid;
        place-items: center;
        font-family: 'Fraunces', serif;
        font-weight: 700;
        font-size: 22px;
      }
      .brand-name {
        font-family: 'Fraunces', Georgia, serif;
        font-size: 21px;
        font-weight: 500;
        color: var(--ink);
      }
      .brand-name b {
        font-weight: 700;
      }
      .brand-sub {
        color: var(--muted);
        font-size: 13px;
        margin-top: 2px;
      }
      .error {
        color: var(--bad);
        margin: 0 0 12px;
        font-size: 13px;
      }
      button mat-spinner {
        margin: 0 auto;
      }
    `,
  ],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  cargando = signal(false);
  error = signal<string | null>(null);

  form = this.fb.group({
    email: ['admin@courier.com', [Validators.required, Validators.email]],
    password: ['admin123', [Validators.required]],
  });

  submit() {
    if (this.form.invalid) return;
    this.cargando.set(true);
    this.error.set(null);
    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: () => {
        this.cargando.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set('Credenciales incorrectas');
        console.error(e);
      },
    });
  }
}
