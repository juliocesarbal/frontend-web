import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-shell">
      <!-- Panel izquierdo: marca + logo (se oculta en móvil) -->
      <aside class="showcase">
        <div class="showcase-inner">
          <div class="logo-badge anim" style="--d: 0ms">
            <img class="logo" src="assets/IconoMalditangopng.png" alt="Courier Inteligente" />
          </div>
          <h1 class="anim" style="--d: 120ms">Courier <b>Inteligente</b></h1>
          <p class="tagline anim" style="--d: 220ms">Tu conexión con el mundo</p>
          <ul class="features">
            <li class="anim" style="--d: 340ms"><span class="dot"></span> Encomiendas, tracking y rutas en tiempo real</li>
            <li class="anim" style="--d: 440ms"><span class="dot"></span> Inteligencia: IA de daño, predicción y zonas</li>
            <li class="anim" style="--d: 540ms"><span class="dot"></span> Trazabilidad en blockchain y reportes BI</li>
          </ul>
        </div>
      </aside>

      <!-- Panel derecho: formulario -->
      <main class="form-side">
        <div class="form-box anim-up">
          <div class="logo-badge-sm"><img class="logo-sm" src="assets/IconoMalditangopng.png" alt="Courier Inteligente" /></div>
          <h2>Bienvenido de vuelta</h2>
          <p class="sub">Ingresa tus credenciales para acceder al panel</p>

          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Correo</mat-label>
              <input matInput type="email" formControlName="email" placeholder="admin@courier.com" autocomplete="username" />
              <mat-icon matSuffix>mail</mat-icon>
            </mat-form-field>
            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Contraseña</mat-label>
              <input matInput [type]="verPass() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" />
              <button mat-icon-button matSuffix type="button" (click)="verPass.set(!verPass())" [attr.aria-label]="verPass() ? 'Ocultar' : 'Mostrar'">
                <mat-icon>{{ verPass() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            @if (error()) {
              <p class="error"><mat-icon>error</mat-icon> {{ error() }}</p>
            }

            <button mat-raised-button color="primary" class="full-width submit" type="submit" [disabled]="form.invalid || cargando()">
              @if (cargando()) {
                <mat-spinner diameter="22"></mat-spinner>
              } @else {
                Iniciar sesión
              }
            </button>
          </form>
        </div>
      </main>
    </div>
  `,
  styles: [
    `
      .login-shell {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 1.05fr 1fr;
        background: var(--paper);
      }

      /* ---- Panel de marca (izquierda) ---- */
      .showcase {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 56px 60px;
        color: #f4f1ea;
        background:
          radial-gradient(900px 500px at 80% -10%, rgba(168, 104, 47, 0.35), transparent),
          linear-gradient(150deg, #2a2521 0%, #1c1917 60%, #14110f 100%);
        overflow: hidden;
      }
      .showcase::after {
        /* aro decorativo sutil */
        content: '';
        position: absolute;
        right: -120px;
        bottom: -120px;
        width: 360px;
        height: 360px;
        border: 1px solid rgba(244, 241, 234, 0.08);
        border-radius: 50%;
      }
      .showcase-inner {
        position: relative;
        z-index: 1;
        max-width: 440px;
      }
      /* Badge claro que abraza el logo (su fondo crema integra con el badge,
         no choca con el panel oscuro). */
      .logo-badge {
        width: 196px;
        height: 196px;
        border-radius: 36px;
        background: #faf6ee;
        display: grid;
        place-items: center;
        margin-bottom: 30px;
        box-shadow: 0 26px 70px -22px rgba(0, 0, 0, 0.75), inset 0 0 0 1px rgba(255, 255, 255, 0.4);
        animation: floaty 5.5s ease-in-out infinite;
      }
      .logo {
        width: 172px;
        height: 172px;
        object-fit: contain;
        border-radius: 26px;
      }
      .showcase h1 {
        font-family: 'Fraunces', Georgia, serif;
        font-size: 38px;
        font-weight: 500;
        color: #f4f1ea;
        margin: 0;
        line-height: 1.1;
      }
      .showcase h1 b {
        font-weight: 700;
      }
      .tagline {
        font-size: 16px;
        color: rgba(244, 241, 234, 0.75);
        margin: 8px 0 30px;
      }
      .features {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 13px;
      }
      .features li {
        display: flex;
        align-items: center;
        gap: 11px;
        font-size: 14.5px;
        color: rgba(244, 241, 234, 0.88);
      }
      .features .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--accent);
        flex: none;
        box-shadow: 0 0 0 4px rgba(168, 104, 47, 0.18);
      }

      /* ---- Panel de formulario (derecha) ---- */
      .form-side {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px 28px;
      }
      .form-box {
        width: 100%;
        max-width: 380px;
      }
      .logo-badge-sm {
        display: none; /* solo aparece en móvil cuando se oculta el showcase */
        width: 92px;
        height: 92px;
        border-radius: 22px;
        background: #faf6ee;
        place-items: center;
        margin-bottom: 18px;
        box-shadow: var(--shadow);
      }
      .logo-sm {
        width: 80px;
        height: 80px;
        object-fit: contain;
      }
      .form-box h2 {
        font-family: 'Fraunces', Georgia, serif;
        font-size: 26px;
        font-weight: 600;
        color: var(--ink);
        margin: 0;
      }
      .form-box .sub {
        color: var(--muted);
        font-size: 14px;
        margin: 6px 0 26px;
      }
      .full-width {
        width: 100%;
      }
      .error {
        display: flex;
        align-items: center;
        gap: 7px;
        color: var(--bad);
        margin: 2px 0 14px;
        font-size: 13px;
      }
      .error mat-icon {
        font-size: 17px;
        height: 17px;
        width: 17px;
      }
      .submit {
        height: 46px;
        font-size: 15px;
        font-weight: 700;
        margin-top: 6px;
      }
      .submit mat-spinner {
        margin: 0 auto;
      }

      /* ---- Animaciones ---- */
      /* Entrada escalonada de los elementos del showcase. */
      .anim {
        opacity: 0;
        animation: rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        animation-delay: var(--d, 0ms);
      }
      /* Entrada de la tarjeta de formulario. */
      .anim-up {
        animation: rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
        animation-delay: 120ms;
      }
      /* Botón con leve realce al hover. */
      .submit {
        transition: transform 0.15s ease, box-shadow 0.2s ease;
      }
      .submit:not([disabled]):hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 26px -12px rgba(28, 25, 23, 0.55);
      }
      @keyframes rise {
        from {
          opacity: 0;
          transform: translateY(16px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes floaty {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-9px);
        }
      }
      /* Respeta a quien prefiere menos movimiento. */
      @media (prefers-reduced-motion: reduce) {
        .anim, .anim-up { animation: none; opacity: 1; }
        .logo-badge { animation: none; }
      }

      @media (max-width: 860px) {
        .login-shell {
          grid-template-columns: 1fr;
        }
        .showcase {
          display: none;
        }
        .logo-badge-sm {
          display: grid;
        }
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
  verPass = signal(false);

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
