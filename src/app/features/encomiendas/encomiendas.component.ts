import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  Encomienda,
  EstadoHistorial,
  EventoBlockchain,
  Ms3EncomiendasService,
} from '../../services/ms3-encomiendas.service';
import { EncomiendaFormDialog } from './encomienda-form.dialog';

const ETHERSCAN_TX = 'https://sepolia.etherscan.io/tx/';

// Transiciones validas de estado (espejo de ms3-operativo/app/core/estados.py).
// Solo se ofrecen los destinos validos; el MS3 igual revalida y responde 409 si no.
const TRANSICIONES: Record<string, string[]> = {
  REGISTRADO: ['EN_TRANSITO', 'CON_INCIDENCIA'],
  EN_TRANSITO: ['EN_REPARTO', 'RETRASADO', 'CON_INCIDENCIA'],
  EN_REPARTO: ['ENTREGADO', 'RETRASADO', 'CON_INCIDENCIA'],
  RETRASADO: ['EN_TRANSITO', 'EN_REPARTO', 'CON_INCIDENCIA'],
  CON_INCIDENCIA: ['EN_TRANSITO', 'EN_REPARTO', 'ENTREGADO'],
  ENTREGADO: [],
};

// Encomiendas + Trazabilidad (MS3). El alta es por modal (cliente elegido de MS1).
// El panel de trazabilidad muestra historial + eventos blockchain y permite avanzar
// el estado (valida el flujo en el MS3; RETRASADO dispara n8n).
@Component({
  selector: 'app-encomiendas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatPaginatorModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h2>Encomiendas</h2>
          <div class="sub">Registro, trazabilidad y estados de los envíos (MS3)</div>
        </div>
        <button mat-raised-button color="primary" (click)="nueva()">
          <mat-icon>add</mat-icon> Nueva encomienda
        </button>
      </div>

      <mat-card>
        @if (cargando()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
        @if (encomiendas().length > 0) {
          <div class="tabla-info">{{ encomiendas().length }} encomiendas</div>
        }
        <table mat-table [dataSource]="pageData()">
          <ng-container matColumnDef="tracking">
            <th mat-header-cell *matHeaderCellDef>Tracking</th>
            <td mat-cell *matCellDef="let e"><b>{{ e.tracking_code }}</b></td>
          </ng-container>
          <ng-container matColumnDef="cliente">
            <th mat-header-cell *matHeaderCellDef>Cliente</th>
            <td mat-cell *matCellDef="let e">{{ e.cliente_nombre || '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="destino">
            <th mat-header-cell *matHeaderCellDef>Destino</th>
            <td mat-cell *matCellDef="let e">{{ e.destino || '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="costo">
            <th mat-header-cell *matHeaderCellDef>Costo</th>
            <td mat-cell *matCellDef="let e">
              {{ e.costo != null ? ('Bs ' + (e.costo | number: '1.2-2')) : '—' }}
            </td>
          </ng-container>
          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let e">
              <span class="estado" [class]="'estado-' + e.estado">{{ e.estado }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let e">
              <button mat-stroked-button (click)="verTrazabilidad(e)">
                <mat-icon>account_tree</mat-icon> Trazabilidad
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
        @if (encomiendas().length > pageSize()) {
          <mat-paginator
            [length]="encomiendas().length"
            [pageSize]="pageSize()"
            [pageIndex]="pageIndex()"
            [pageSizeOptions]="[10, 25, 50, 100]"
            (page)="onPage($event)"
            showFirstLastButtons
          ></mat-paginator>
        }
        @if (!cargando() && encomiendas().length === 0) {
          <div class="empty">
            <mat-icon>inbox</mat-icon>
            <p>Sin encomiendas. Registra una con “Nueva encomienda”.</p>
          </div>
        }
      </mat-card>

      @if (seleccionada(); as sel) {
        <mat-card class="traza">
          <div class="traza-head">
            <h3><mat-icon>account_tree</mat-icon> Trazabilidad — {{ sel.tracking_code }}</h3>
            <button mat-icon-button (click)="cerrarTraza()" title="Cerrar"><mat-icon>close</mat-icon></button>
          </div>

          <div class="cambiar">
            <span>Estado actual: <span class="estado" [class]="'estado-' + sel.estado">{{ sel.estado }}</span></span>
            @if (estadosPermitidos().length > 0) {
              <mat-form-field appearance="outline" class="estado-sel">
                <mat-label>Nuevo estado</mat-label>
                <mat-select [(ngModel)]="nuevoEstado">
                  @for (s of estadosPermitidos(); track s) { <mat-option [value]="s">{{ s }}</mat-option> }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Ubicación (opcional)</mat-label>
                <input matInput [(ngModel)]="ubicacionEstado" />
              </mat-form-field>
              <button mat-raised-button color="accent" [disabled]="!nuevoEstado || cambiando()" (click)="cambiarEstado()">
                <mat-icon>sync_alt</mat-icon> Cambiar estado
              </button>
            } @else {
              <span class="badge green">Entregado — estado terminal</span>
            }
          </div>
          @if (cambiando()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

          <div class="dos-col">
            <div>
              <h4>Historial de estados</h4>
              @for (h of historial(); track h.fecha) {
                <div class="evento">
                  <mat-icon>radio_button_checked</mat-icon>
                  <span><b>{{ h.estado }}</b> · {{ h.fecha | date: 'short' }}
                    @if (h.ubicacion) { · {{ h.ubicacion }} }</span>
                </div>
              }
            </div>
            <div>
              <h4>Eventos en blockchain</h4>
              @if (eventos().length === 0) { <p class="muted">Sin eventos.</p> }
              @for (ev of eventos(); track ev.id) {
                <div class="evento">
                  <mat-icon>link</mat-icon>
                  <span>
                    <b>{{ ev.tipo_evento }}</b><br />
                    <code>{{ ev.hash_sha256 | slice: 0 : 18 }}…</code><br />
                    @if (ev.tx_hash) {
                      <a [href]="etherscan + ev.tx_hash" target="_blank">Ver en Etherscan ↗</a>
                    } @else {
                      <span class="pendiente">local (pendiente de cadena)</span>
                    }
                  </span>
                </div>
              }
            </div>
          </div>
        </mat-card>
      }
    </div>
  `,
  styles: [
    `
      .tabla-info { padding: 8px 4px; color: var(--muted); font-size: 13px; }
      .traza { margin-top: 16px; padding: 16px; }
      .traza-head { display: flex; align-items: center; justify-content: space-between; }
      .traza-head h3 { display: flex; align-items: center; gap: 8px; margin: 0; }
      .cambiar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 12px 0; margin: 8px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
      .estado-sel { width: 210px; }
      .muted { color: var(--muted); }
      .dos-col { display: flex; gap: 32px; flex-wrap: wrap; margin-top: 12px; }
      .dos-col > div { flex: 1; min-width: 280px; }
      .evento { display: flex; gap: 8px; align-items: flex-start; margin: 8px 0; font-size: 14px; }
      .evento mat-icon { color: var(--accent); font-size: 20px; height: 20px; width: 20px; }
      code { background: var(--surface-2); border: 1px solid var(--line); padding: 1px 4px; border-radius: 3px; }
      .pendiente { color: var(--warn); font-size: 12px; }
    `,
  ],
})
export class EncomiendasComponent {
  private ms3 = inject(Ms3EncomiendasService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  cols = ['tracking', 'cliente', 'destino', 'costo', 'estado', 'acciones'];
  etherscan = ETHERSCAN_TX;

  encomiendas = signal<Encomienda[]>([]);
  seleccionada = signal<Encomienda | null>(null);
  historial = signal<EstadoHistorial[]>([]);
  eventos = signal<EventoBlockchain[]>([]);
  cargando = signal(false);
  cambiando = signal(false);

  // Paginación client-side: la lista completa vive en `encomiendas`, la tabla
  // muestra solo la página actual (`pageData`).
  pageIndex = signal(0);
  pageSize = signal(10);
  pageData = computed(() => {
    const all = this.encomiendas();
    const start = this.pageIndex() * this.pageSize();
    return all.slice(start, start + this.pageSize());
  });

  estadosPermitidos = computed(() => {
    const e = this.seleccionada();
    return e ? TRANSICIONES[e.estado] ?? [] : [];
  });

  nuevoEstado = '';
  ubicacionEstado = '';

  constructor() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.ms3.listar().subscribe({
      next: (l) => {
        this.encomiendas.set(l ?? []);
        this.pageIndex.set(0);
        this.cargando.set(false);
      },
      error: (e) => {
        this.snack.open(this.err(e, 'Error al listar'), 'Cerrar', { duration: 4000 });
        this.cargando.set(false);
      },
    });
  }

  nueva() {
    this.dialog
      .open(EncomiendaFormDialog, { width: '600px', autoFocus: false })
      .afterClosed()
      .subscribe((creada: Encomienda | undefined) => {
        if (creada) {
          this.cargar();
          this.verTrazabilidad(creada);
        }
      });
  }

  verTrazabilidad(e: Encomienda) {
    this.seleccionada.set(e);
    this.nuevoEstado = '';
    this.ubicacionEstado = '';
    this.historial.set([]);
    this.eventos.set([]);
    this.refrescarTraza(e.tracking_code);
  }

  cerrarTraza() {
    this.seleccionada.set(null);
  }

  onPage(e: PageEvent) {
    this.pageIndex.set(e.pageIndex);
    this.pageSize.set(e.pageSize);
  }

  private refrescarTraza(trk: string) {
    this.ms3.tracking(trk).subscribe({ next: (t) => this.historial.set(t.historial ?? []), error: () => {} });
    this.ms3.eventosBlockchain(trk).subscribe({ next: (ev) => this.eventos.set(ev ?? []), error: () => {} });
  }

  cambiarEstado() {
    const e = this.seleccionada();
    if (!e || !this.nuevoEstado) return;
    this.cambiando.set(true);
    this.ms3.cambiarEstado(e.tracking_code, this.nuevoEstado, this.ubicacionEstado || undefined).subscribe({
      next: (act) => {
        this.snack.open(`Estado → ${act.estado}`, 'Cerrar', { duration: 3000 });
        this.seleccionada.set(act);
        this.nuevoEstado = '';
        this.ubicacionEstado = '';
        this.cambiando.set(false);
        this.cargar();
        this.refrescarTraza(act.tracking_code);
        // El evento CAMBIO_ESTADO se mina en background (~15s); reconsulta los
        // eventos para que aparezca el enlace a Etherscan sin reabrir el panel.
        setTimeout(() => {
          if (this.seleccionada()?.tracking_code === act.tracking_code) {
            this.ms3.eventosBlockchain(act.tracking_code).subscribe({
              next: (ev) => this.eventos.set(ev ?? []),
              error: () => {},
            });
          }
        }, 20000);
      },
      error: (err) => {
        this.snack.open(this.err(err, 'No se pudo cambiar el estado'), 'Cerrar', { duration: 4000 });
        this.cambiando.set(false);
      },
    });
  }

  private err(e: any, fallback: string): string {
    if (e?.status === 401) return 'No autorizado: inicia sesión de nuevo';
    if (e?.status === 403) return 'Sin permiso (requiere ADMIN)';
    if (e?.status === 409) return e?.error?.detail ?? 'Transición de estado inválida';
    if (e?.status === 0) return 'No se pudo contactar al MS3 (¿está corriendo?)';
    return e?.error?.detail ?? e?.message ?? fallback;
  }
}
