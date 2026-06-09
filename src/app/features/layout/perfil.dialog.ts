import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';

// Modal de perfil (solo lectura): muestra los datos del usuario autenticado que
// el login de MS1 ya entrega (nombre, email, rol, id). Sin edición.
@Component({
  selector: 'app-perfil-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="hero">
      <span class="avatar">{{ iniciales }}</span>
      <div class="ident">
        <h2>{{ auth.nombre || 'Usuario' }}</h2>
        <span class="rol-chip">{{ rolLabel }}</span>
      </div>
    </div>

    <mat-dialog-content>
      <ul class="campos">
        <li>
          <span class="ico"><mat-icon>badge</mat-icon></span>
          <div><label>Nombre</label><b>{{ auth.nombre || '—' }}</b></div>
        </li>
        <li>
          <span class="ico"><mat-icon>mail</mat-icon></span>
          <div><label>Correo</label><b>{{ auth.email || '—' }}</b></div>
        </li>
        <li>
          <span class="ico"><mat-icon>verified_user</mat-icon></span>
          <div><label>Rol</label><b>{{ rolLabel }}</b></div>
        </li>
        <li>
          <span class="ico"><mat-icon>tag</mat-icon></span>
          <div><label>ID de usuario</label><b>{{ auth.userId || '—' }}</b></div>
        </li>
      </ul>
      <p class="nota">Datos provistos por el inicio de sesión (MS1 Empresarial).</p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .hero {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 22px 24px 18px;
        background: linear-gradient(135deg, var(--accent-soft), var(--surface-2));
        border-bottom: 1px solid var(--line);
      }
      .avatar {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: var(--accent);
        color: #fff;
        display: grid;
        place-items: center;
        font-family: 'Fraunces', Georgia, serif;
        font-weight: 700;
        font-size: 24px;
        flex: none;
        box-shadow: 0 6px 16px -8px rgba(168, 104, 47, 0.7);
      }
      .ident h2 {
        margin: 0 0 6px;
        font-size: 22px;
        font-weight: 600;
      }
      .rol-chip {
        display: inline-block;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--accent);
        background: var(--surface);
        border: 1px solid var(--line);
        padding: 3px 10px;
        border-radius: 999px;
      }
      mat-dialog-content {
        padding: 18px 24px 6px !important;
        min-width: 360px;
      }
      .campos {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .campos li {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 11px 4px;
        border-bottom: 1px solid var(--line);
      }
      .campos li:last-child {
        border-bottom: 0;
      }
      .ico {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        background: var(--surface-2);
        display: grid;
        place-items: center;
        flex: none;
      }
      .ico mat-icon {
        color: var(--accent);
        font-size: 20px;
        height: 20px;
        width: 20px;
      }
      .campos label {
        display: block;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 2px;
      }
      .campos b {
        font-size: 14.5px;
        color: var(--ink);
        font-weight: 600;
        word-break: break-word;
      }
      .nota {
        margin: 14px 0 4px;
        font-size: 11.5px;
        color: var(--muted);
      }
      @media (max-width: 480px) {
        mat-dialog-content {
          min-width: 0;
        }
      }
    `,
  ],
})
export class PerfilDialog {
  auth = inject(AuthService);

  get rolLabel(): string {
    const r = (this.auth.rol ?? '').toUpperCase();
    return { ADMIN: 'Administrador', CLIENTE: 'Cliente', ASESOR: 'Asesor / Repartidor' }[r] ?? r ?? '—';
  }

  get iniciales(): string {
    const n = (this.auth.nombre ?? '').trim();
    if (!n) return '?';
    const parts = n.split(/[\s@.]+/).filter(Boolean);
    const ini = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
    return ini.toUpperCase() || n[0].toUpperCase();
  }
}
