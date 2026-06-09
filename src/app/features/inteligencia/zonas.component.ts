import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Ms3DatasetsService, ZonaMetrica } from '../../services/ms3-datasets.service';

const ORDEN_GRUPO = ['ALTA_DEMANDA', 'RETRASOS_FRECUENTES', 'BAJA_DEMANDA'];

// CU-13 — ML no supervisado: agrupación de zonas (K-Means). Página propia.
// Muestra las zonas reales de la BD con su grupo, y permite reclasificarlas
// aplicando el modelo entrenado (igual que la pestaña Datasets · Zonas).
@Component({
  selector: 'app-zonas',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <a routerLink="/inteligencia" class="back"><mat-icon>arrow_back</mat-icon> Inteligencia</a>
      <div class="page-head">
        <div class="head-ttl">
          <span class="ico"><mat-icon>scatter_plot</mat-icon></span>
          <div>
            <h2>ML · Agrupar zonas (K-Means)</h2>
            <div class="sub">Modelo no supervisado → alta demanda / retrasos frecuentes / baja demanda</div>
          </div>
        </div>
        <button mat-raised-button color="primary" (click)="reclasificar()" [disabled]="cargando()">
          <mat-icon>auto_awesome</mat-icon> Reclasificar (K-Means)
        </button>
      </div>

      @if (cargando()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

      <!-- Distribución por grupo + última clasificación -->
      <mat-card class="resumen">
        <div class="resumen-head">
          <h3>Última clasificación</h3>
          <span class="cuando">
            @if (ultima()) { <mat-icon class="mini">schedule</mat-icon> Reclasificado {{ ultima() | date: 'short' }} }
            @else { <mat-icon class="mini">database</mat-icon> Clasificación del último entrenamiento }
          </span>
        </div>
        <div class="dist">
          @for (d of distGrupo(); track d.k) {
            <div class="bar">
              <span class="bar-k"><span class="dot" [class]="'g-' + d.k"></span>{{ etiqueta(d.k) }}</span>
              <div class="track"><div class="fill" [class]="'g-' + d.k" [style.width.%]="d.pct"></div></div>
              <span class="bar-v">{{ d.v }} zonas</span>
            </div>
          }
          @if (distGrupo().length === 0) { <p class="muted">Sin zonas clasificadas todavía.</p> }
        </div>
      </mat-card>

      <!-- Tabla de zonas con su grupo -->
      <mat-card>
        <table mat-table [dataSource]="zonas()">
          <ng-container matColumnDef="nombre"><th mat-header-cell *matHeaderCellDef>Zona</th>
            <td mat-cell *matCellDef="let z"><b>{{ z.nombre }}</b></td></ng-container>
          <ng-container matColumnDef="codigo"><th mat-header-cell *matHeaderCellDef>Sector</th>
            <td mat-cell *matCellDef="let z">{{ z.codigo }}</td></ng-container>
          <ng-container matColumnDef="envios"><th mat-header-cell *matHeaderCellDef>Envíos</th>
            <td mat-cell *matCellDef="let z">{{ z.num_envios | number: '1.0-0' }}</td></ng-container>
          <ng-container matColumnDef="tiempo"><th mat-header-cell *matHeaderCellDef>T. entrega</th>
            <td mat-cell *matCellDef="let z">{{ z.tiempo_entrega_prom | number: '1.0-0' }} h</td></ng-container>
          <ng-container matColumnDef="incidencias"><th mat-header-cell *matHeaderCellDef>Incidencias</th>
            <td mat-cell *matCellDef="let z">{{ z.num_incidencias | number: '1.0-0' }}</td></ng-container>
          <ng-container matColumnDef="grupo"><th mat-header-cell *matHeaderCellDef>Grupo (K-Means)</th>
            <td mat-cell *matCellDef="let z">
              @if (z.grupo) { <span class="chip g-{{ z.grupo }}">{{ etiqueta(z.grupo) }}</span> }
              @else { <span class="muted">sin clasificar</span> }
            </td></ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
        @if (!cargando() && zonas().length === 0) {
          <div class="vacio"><mat-icon>scatter_plot</mat-icon><p>Sin zonas. Corré el seed del MS3 primero.</p></div>
        }
      </mat-card>
    </div>
  `,
  styles: [
    `
      .back { display: inline-flex; align-items: center; gap: 4px; color: var(--muted); text-decoration: none; font-size: 13px; margin-bottom: 10px; }
      .back:hover { color: var(--accent); }
      .back mat-icon { font-size: 18px; height: 18px; width: 18px; }
      .page-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
      .head-ttl { display: flex; align-items: center; gap: 14px; }
      .head-ttl .ico { width: 46px; height: 46px; border-radius: 12px; background: var(--ink); color: #f4f1ea; display: grid; place-items: center; }
      mat-card { padding: 18px; }
      .resumen { margin-bottom: 16px; }
      .resumen-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
      .resumen-head h3 { margin: 0; font-size: 16px; }
      .cuando { display: inline-flex; align-items: center; gap: 5px; color: var(--muted); font-size: 12.5px; }
      .dist { display: flex; flex-direction: column; gap: 9px; max-width: 560px; }
      .bar { display: grid; grid-template-columns: 180px 1fr 70px; align-items: center; gap: 10px; font-size: 13px; }
      .bar-k { display: flex; align-items: center; gap: 7px; color: var(--ink-2); }
      .bar-v { text-align: right; color: var(--muted); font-weight: 600; }
      .track { height: 9px; background: var(--surface-2); border-radius: 6px; overflow: hidden; }
      .fill { height: 100%; border-radius: 6px; background: var(--ink); }
      .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--muted); }
      /* Colores SÓLIDOS solo para los indicadores (dot/fill de las barras), NO el chip. */
      .dot.g-ALTA_DEMANDA, .fill.g-ALTA_DEMANDA { background: var(--ok); }
      .dot.g-RETRASOS_FRECUENTES, .fill.g-RETRASOS_FRECUENTES { background: var(--bad); }
      .dot.g-BAJA_DEMANDA, .fill.g-BAJA_DEMANDA { background: var(--muted); }
      /* Chip del grupo: fondo tintado de color + texto NEGRO para que se lea. */
      .chip { display: inline-flex; padding: 4px 11px; border-radius: 999px; font-size: 12px; font-weight: 700; color: var(--ink); }
      .chip.g-ALTA_DEMANDA { background: rgba(77,124,74,.16); }
      .chip.g-RETRASOS_FRECUENTES { background: rgba(161,59,47,.14); }
      .chip.g-BAJA_DEMANDA { background: var(--surface-2); }
      .muted { color: var(--muted); }
      .mini { font-size: 16px; height: 16px; width: 16px; vertical-align: middle; }
      .vacio { padding: 36px 12px; text-align: center; color: var(--muted); }
      .vacio mat-icon { font-size: 40px; height: 40px; width: 40px; opacity: .4; }
    `,
  ],
})
export class ZonasComponent {
  private ds = inject(Ms3DatasetsService);
  private snack = inject(MatSnackBar);

  cols = ['nombre', 'codigo', 'envios', 'tiempo', 'incidencias', 'grupo'];
  zonas = signal<ZonaMetrica[]>([]);
  cargando = signal(false);
  ultima = signal<Date | null>(null);

  // Distribución por grupo, calculada de las zonas cargadas.
  distGrupo = computed(() => {
    const conteo: Record<string, number> = {};
    for (const z of this.zonas()) if (z.grupo) conteo[z.grupo] = (conteo[z.grupo] ?? 0) + 1;
    const total = Object.values(conteo).reduce((a, b) => a + b, 0) || 1;
    return ORDEN_GRUPO.filter((k) => k in conteo).map((k) => ({ k, v: conteo[k], pct: (conteo[k] / total) * 100 }));
  });

  constructor() {
    this.cargar();
  }

  etiqueta(g: string): string {
    return ({ ALTA_DEMANDA: 'Alta demanda', RETRASOS_FRECUENTES: 'Retrasos frecuentes', BAJA_DEMANDA: 'Baja demanda' } as Record<string, string>)[g] ?? g;
  }

  cargar() {
    this.cargando.set(true);
    this.ds.zonas().subscribe({
      next: (z) => { this.zonas.set(z); this.cargando.set(false); },
      error: (e) => { this.snack.open(this.err(e), 'Cerrar', { duration: 4000 }); this.cargando.set(false); },
    });
  }

  reclasificar() {
    this.cargando.set(true);
    this.ds.reclasificarZonas().subscribe({
      next: (z) => {
        this.zonas.set(z);
        this.ultima.set(new Date());
        this.cargando.set(false);
        this.snack.open('Zonas reclasificadas con K-Means', 'Cerrar', { duration: 3000 });
      },
      error: (e) => { this.snack.open(this.err(e), 'Cerrar', { duration: 4000 }); this.cargando.set(false); },
    });
  }

  private err(e: any): string {
    if (e?.status === 401) return 'No autorizado: inicia sesión de nuevo';
    if (e?.status === 403) return 'Sin permiso (requiere ADMIN)';
    if (e?.status === 404) return 'No hay zonas. Corré el seed del MS3.';
    if (e?.status === 503) return 'Modelo no entrenado en el MS3';
    if (e?.status === 0) return 'No se pudo contactar al MS3 (¿está corriendo?)';
    return e?.error?.detail ?? e?.message ?? 'Error';
  }
}
