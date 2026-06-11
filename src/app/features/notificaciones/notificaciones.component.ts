import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Ms3NotificacionesService, Notificacion } from '../../services/ms3-notificaciones.service';

@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h2>Notificaciones</h2>
          <div class="sub">{{ noLeidas() ? noLeidas() + ' sin leer' : 'Todo al día' }}</div>
        </div>
        @if (noLeidas() > 0) {
          <button mat-stroked-button (click)="leerTodas()"><mat-icon>done_all</mat-icon> Marcar todas</button>
        }
      </div>

      <mat-card>
        @if (cargando()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
        @if (!cargando() && items().length === 0) {
          <div class="empty"><mat-icon>notifications_none</mat-icon><p>Sin notificaciones.</p></div>
        }
        @for (n of items(); track n.id) {
          <div class="noti" [class.no-leida]="!n.leida">
            <div class="noti-main">
              <div class="noti-top">
                @if (!n.leida) { <span class="dot"></span> }
                <span class="titulo">{{ n.titulo }}</span>
                <span class="chip" [class]="'chip-' + n.tipo">{{ n.tipo }}</span>
              </div>
              @if (n.cuerpo) { <div class="cuerpo">{{ n.cuerpo }}</div> }
              <div class="fecha">{{ n.created_at | date: 'short' }}</div>
            </div>
            <div class="noti-acc">
              @if (!n.leida) {
                <button mat-icon-button title="Marcar leída" (click)="leer(n)"><mat-icon>mark_email_read</mat-icon></button>
              }
              @if (asesorDe(n)) {
                <button mat-stroked-button (click)="responder(n)"><mat-icon>reply</mat-icon> Responder</button>
              }
            </div>
          </div>
        }
      </mat-card>
    </div>
  `,
  styles: [
    `
      .page { padding: 8px 4px; }
      .sub { color: var(--muted); font-size: 13px; }
      .noti { display: flex; gap: 12px; align-items: flex-start; justify-content: space-between; padding: 12px 8px; border-bottom: 1px solid var(--line); }
      .noti.no-leida { background: var(--surface-2); }
      .noti-main { flex: 1; min-width: 0; }
      .noti-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
      .titulo { font-weight: 600; }
      .cuerpo { color: var(--ink-2); margin-top: 4px; font-size: 14px; }
      .fecha { color: var(--muted); font-size: 12px; margin-top: 4px; }
      .chip { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: var(--surface); border: 1px solid var(--line); color: var(--muted); }
      .chip-INCIDENCIA { background: rgba(161,59,47,0.12); color: #a13b2f; border-color: transparent; }
      .chip-RUTA_ASIGNADA { background: var(--accent-soft); color: var(--accent); border-color: transparent; }
      .chip-ENTREGA, .chip-RESPUESTA_ADMIN { background: rgba(77,124,74,0.16); color: #4d7c4a; border-color: transparent; }
      .noti-acc { display: flex; align-items: center; gap: 6px; }
      .empty { text-align: center; color: var(--muted); padding: 32px; }
    `,
  ],
})
export class NotificacionesComponent {
  private svc = inject(Ms3NotificacionesService);
  private snack = inject(MatSnackBar);

  items = signal<Notificacion[]>([]);
  cargando = signal(false);
  noLeidas = computed(() => this.items().filter((n) => !n.leida).length);

  constructor() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.svc.listar().subscribe({
      next: (l) => {
        this.items.set(l ?? []);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  leer(n: Notificacion) {
    this.svc.leer(n.id).subscribe(() => {
      this.items.update((arr) => arr.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
    });
  }

  leerTodas() {
    this.svc.leerTodas().subscribe(() => {
      this.items.update((arr) => arr.map((x) => ({ ...x, leida: true })));
    });
  }

  // Extrae el asesor_id del payload (incidencias del asesor) para poder responderle.
  asesorDe(n: Notificacion): string | null {
    if (!n.data_json) return null;
    try {
      const d = JSON.parse(n.data_json);
      return d.asesor_id != null ? String(d.asesor_id) : null;
    } catch {
      return null;
    }
  }

  responder(n: Notificacion) {
    const asesorId = this.asesorDe(n);
    if (!asesorId) return;
    const msg = window.prompt(
      'Mensaje para el asesor:',
      'Tu incidencia será atendida a la brevedad posible.',
    );
    if (!msg) return;
    this.svc.responderAsesor(asesorId, 'Respuesta del administrador', msg).subscribe({
      next: () => this.snack.open('Respuesta enviada al asesor', 'Cerrar', { duration: 2800 }),
      error: (e) => this.snack.open(e?.error?.detail ?? 'Error al enviar', 'Cerrar', { duration: 3500 }),
    });
  }
}
