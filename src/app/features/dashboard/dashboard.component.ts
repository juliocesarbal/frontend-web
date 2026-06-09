import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h2>Bienvenido, {{ auth.nombre }}</h2>
          <div class="sub">Panel de administración del Sistema de Courier Inteligente</div>
        </div>
      </div>

      <div class="card-grid">
        <mat-card routerLink="/clientes" class="acceso">
          <mat-icon>people</mat-icon>
          <span>Clientes</span>
        </mat-card>
        <mat-card routerLink="/servicios" class="acceso">
          <mat-icon>local_shipping</mat-icon>
          <span>Servicios</span>
        </mat-card>
        <mat-card routerLink="/tarifas" class="acceso">
          <mat-icon>calculate</mat-icon>
          <span>Calcular tarifa</span>
        </mat-card>
        @if (auth.rol === 'ADMIN') {
          <mat-card routerLink="/usuarios" class="acceso">
            <mat-icon>manage_accounts</mat-icon>
            <span>Usuarios</span>
          </mat-card>
          <mat-card routerLink="/reportes" class="acceso">
            <mat-icon>bar_chart</mat-icon>
            <span>Reportes</span>
          </mat-card>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .acceso {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 30px 24px;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      }
      .acceso:hover {
        transform: translateY(-3px);
        border-color: var(--accent) !important;
        box-shadow: 0 12px 28px -14px rgba(28, 25, 23, 0.3) !important;
      }
      .acceso mat-icon {
        font-size: 38px;
        height: 38px;
        width: 38px;
        color: var(--accent);
      }
      .acceso span {
        margin-top: 8px;
        font-weight: 600;
        color: var(--ink);
      }
    `,
  ],
})
export class DashboardComponent {
  auth = inject(AuthService);
}
