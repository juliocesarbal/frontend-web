import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  EnvioHistorico,
  IncidenteZona,
  Ms3DatasetsService,
  ResumenDataset,
  Sucursal,
  ZonaMetrica,
} from '../../services/ms3-datasets.service';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Página para VER los datasets que alimentan los modelos de ML del MS3:
// envíos históricos (supervisado), zonas (K-Means) y sucursales. Datos reales
// desde PostgreSQL (GCP) vía /api/ops/ml/dataset/* y /api/ops/sucursales.
@Component({
  selector: 'app-datasets',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h2>Datasets de Machine Learning</h2>
          <div class="sub">Datos reales (PostgreSQL · GCP) que alimentan los modelos del MS3</div>
        </div>
        <button mat-stroked-button (click)="cargar()" [disabled]="cargando()">
          <mat-icon>refresh</mat-icon> Actualizar
        </button>
      </div>

      @if (cargando()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

      <!-- KPIs -->
      <div class="kpis">
        <mat-card class="kpi">
          <span class="ico"><mat-icon>store</mat-icon></span>
          <div><div class="num">{{ resumen()?.sucursales ?? '—' }}</div><div class="lbl">Sucursales</div></div>
        </mat-card>
        <mat-card class="kpi">
          <span class="ico"><mat-icon>scatter_plot</mat-icon></span>
          <div><div class="num">{{ resumen()?.zonas ?? '—' }}</div><div class="lbl">Zonas de reparto</div></div>
        </mat-card>
        <mat-card class="kpi">
          <span class="ico"><mat-icon>history</mat-icon></span>
          <div><div class="num">{{ resumen()?.envios_historicos ?? '—' }}</div><div class="lbl">Envíos históricos</div></div>
        </mat-card>
        <mat-card class="kpi">
          <span class="ico warn"><mat-icon>report</mat-icon></span>
          <div><div class="num">{{ resumen()?.incidentes ?? '—' }}</div><div class="lbl">Incidentes reportados</div></div>
        </mat-card>
      </div>

      <mat-tab-group class="tabs" animationDuration="180ms">
        <!-- ============ Envíos históricos (supervisado) ============ -->
        <mat-tab label="Envíos · supervisado">
          <div class="tab-body">
            <p class="leyenda">
              <mat-icon>online_prediction</mat-icon>
              Dataset del modelo de <b>retraso (RandomForest)</b>. Envío sucursal → sucursal. Features: peso, distancia, hora, día y servicio → <b>riesgo</b>.
            </p>

            <div class="dist">
              <div class="dist-col">
                <h4>Por riesgo</h4>
                @for (d of distRiesgo(); track d.k) {
                  <div class="bar">
                    <span class="bar-k"><span class="dot" [class]="'r-' + d.k"></span>{{ d.k }}</span>
                    <div class="track"><div class="fill" [class]="'r-' + d.k" [style.width.%]="d.pct"></div></div>
                    <span class="bar-v">{{ d.v }}</span>
                  </div>
                }
              </div>
              <div class="dist-col">
                <h4>Por servicio</h4>
                @for (d of distServicio(); track d.k) {
                  <div class="bar">
                    <span class="bar-k">{{ d.k }}</span>
                    <div class="track"><div class="fill neutral" [style.width.%]="d.pct"></div></div>
                    <span class="bar-v">{{ d.v }}</span>
                  </div>
                }
              </div>
            </div>

            <div class="filtro">
              <span>Filtrar:</span>
              <mat-button-toggle-group [value]="filtroRiesgo()" (change)="setFiltro($event.value)">
                <mat-button-toggle value="">Todos</mat-button-toggle>
                <mat-button-toggle value="BAJO">Bajo</mat-button-toggle>
                <mat-button-toggle value="MEDIO">Medio</mat-button-toggle>
                <mat-button-toggle value="ALTO">Alto</mat-button-toggle>
              </mat-button-toggle-group>
              <span class="muted">mostrando {{ envios().length }} de {{ resumen()?.envios_historicos ?? 0 }}</span>
            </div>

            <mat-card>
              <table mat-table [dataSource]="envios()">
                <ng-container matColumnDef="ref"><th mat-header-cell *matHeaderCellDef>Ref</th>
                  <td mat-cell *matCellDef="let e"><b>{{ e.tracking_ref }}</b></td></ng-container>
                <ng-container matColumnDef="peso"><th mat-header-cell *matHeaderCellDef>Peso</th>
                  <td mat-cell *matCellDef="let e">{{ e.peso | number: '1.1-1' }} kg</td></ng-container>
                <ng-container matColumnDef="distancia"><th mat-header-cell *matHeaderCellDef>Distancia</th>
                  <td mat-cell *matCellDef="let e">{{ e.distancia | number: '1.0-0' }} km</td></ng-container>
                <ng-container matColumnDef="servicio"><th mat-header-cell *matHeaderCellDef>Servicio</th>
                  <td mat-cell *matCellDef="let e">{{ e.tipo_servicio }}</td></ng-container>
                <ng-container matColumnDef="zona"><th mat-header-cell *matHeaderCellDef>Destino</th>
                  <td mat-cell *matCellDef="let e">{{ e.zona }}</td></ng-container>
                <ng-container matColumnDef="hora"><th mat-header-cell *matHeaderCellDef>Hora</th>
                  <td mat-cell *matCellDef="let e">{{ e.hora }}:00</td></ng-container>
                <ng-container matColumnDef="dia"><th mat-header-cell *matHeaderCellDef>Día</th>
                  <td mat-cell *matCellDef="let e">{{ dias[e.dia_semana] }}</td></ng-container>
                <ng-container matColumnDef="aTiempo"><th mat-header-cell *matHeaderCellDef>A tiempo</th>
                  <td mat-cell *matCellDef="let e">
                    <mat-icon class="mini" [class.ok]="e.entregado_a_tiempo" [class.no]="!e.entregado_a_tiempo">
                      {{ e.entregado_a_tiempo ? 'check_circle' : 'cancel' }}
                    </mat-icon>
                  </td></ng-container>
                <ng-container matColumnDef="riesgo"><th mat-header-cell *matHeaderCellDef>Riesgo</th>
                  <td mat-cell *matCellDef="let e"><span class="chip r-{{ e.riesgo }}">{{ e.riesgo }}</span></td></ng-container>
                <tr mat-header-row *matHeaderRowDef="colsEnvios"></tr>
                <tr mat-row *matRowDef="let row; columns: colsEnvios"></tr>
              </table>
            </mat-card>
          </div>
        </mat-tab>

        <!-- ============ Zonas (K-Means) ============ -->
        <mat-tab label="Zonas · K-Means">
          <div class="tab-body">
            <div class="zona-head">
              <p class="leyenda">
                <mat-icon>scatter_plot</mat-icon>
                Dataset del modelo <b>no supervisado (K-Means)</b>. Agrupa zonas por comportamiento → grupo.
              </p>
              <button mat-raised-button color="primary" (click)="reclasificar()" [disabled]="cargando()">
                <mat-icon>auto_awesome</mat-icon> Reclasificar (K-Means)
              </button>
            </div>

            <div class="dist">
              <div class="dist-col">
                <h4>Por grupo descubierto</h4>
                @for (d of distGrupo(); track d.k) {
                  <div class="bar">
                    <span class="bar-k"><span class="dot" [class]="'g-' + d.k"></span>{{ etiquetaGrupo(d.k) }}</span>
                    <div class="track"><div class="fill" [class]="'g-' + d.k" [style.width.%]="d.pct"></div></div>
                    <span class="bar-v">{{ d.v }}</span>
                  </div>
                }
              </div>
            </div>

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
                    @if (z.grupo) { <span class="chip g-{{ z.grupo }}">{{ etiquetaGrupo(z.grupo) }}</span> }
                    @else { <span class="muted">sin clasificar</span> }
                  </td></ng-container>
                <tr mat-header-row *matHeaderRowDef="colsZonas"></tr>
                <tr mat-row *matRowDef="let row; columns: colsZonas"></tr>
              </table>
            </mat-card>
          </div>
        </mat-tab>

        <!-- ============ Sucursales ============ -->
        <mat-tab label="Sucursales">
          <div class="tab-body">
            <p class="leyenda">
              <mat-icon>store</mat-icon>
              Red logística (nodos). Su GPS define la <b>distancia</b> de cada envío (carretera, OSRM).
            </p>
            <mat-card>
              <table mat-table [dataSource]="sucursales()">
                <ng-container matColumnDef="nombre"><th mat-header-cell *matHeaderCellDef>Sucursal</th>
                  <td mat-cell *matCellDef="let s"><b>{{ s.nombre }}</b></td></ng-container>
                <ng-container matColumnDef="departamento"><th mat-header-cell *matHeaderCellDef>Departamento</th>
                  <td mat-cell *matCellDef="let s">{{ s.departamento }}</td></ng-container>
                <ng-container matColumnDef="ciudad"><th mat-header-cell *matHeaderCellDef>Ciudad</th>
                  <td mat-cell *matCellDef="let s">{{ s.ciudad }}</td></ng-container>
                <ng-container matColumnDef="gps"><th mat-header-cell *matHeaderCellDef>GPS</th>
                  <td mat-cell *matCellDef="let s" class="mono">{{ s.gps_lat | number: '1.4-4' }}, {{ s.gps_lng | number: '1.4-4' }}</td></ng-container>
                <ng-container matColumnDef="activa"><th mat-header-cell *matHeaderCellDef>Estado</th>
                  <td mat-cell *matCellDef="let s">
                    <span class="chip" [class.g-ALTA_DEMANDA]="s.activa" [class.muted-chip]="!s.activa">{{ s.activa ? 'Activa' : 'Inactiva' }}</span>
                  </td></ng-container>
                <tr mat-header-row *matHeaderRowDef="colsSuc"></tr>
                <tr mat-row *matRowDef="let row; columns: colsSuc"></tr>
              </table>
            </mat-card>
          </div>
        </mat-tab>

        <!-- ============ Incidentes reportados (asesores) ============ -->
        <mat-tab label="Incidentes · campo">
          <div class="tab-body">
            <p class="leyenda">
              <mat-icon>report</mat-icon>
              Reportes de asesores en ruta (bloqueos, tráfico, eventos sociales). Alimentan el K-Means por <b>zona y día</b>.
            </p>

            <div class="dist">
              <div class="dist-col">
                <h4>Por tipo</h4>
                @for (d of distIncTipo(); track d.k) {
                  <div class="bar">
                    <span class="bar-k">{{ d.k }}</span>
                    <div class="track"><div class="fill neutral" [style.width.%]="d.pct"></div></div>
                    <span class="bar-v">{{ d.v }}</span>
                  </div>
                }
              </div>
              <div class="dist-col">
                <h4>Por día de la semana</h4>
                @for (d of distIncDia(); track d.k) {
                  <div class="bar">
                    <span class="bar-k">{{ d.k }}</span>
                    <div class="track"><div class="fill" [style.width.%]="d.pct"></div></div>
                    <span class="bar-v">{{ d.v }}</span>
                  </div>
                }
              </div>
            </div>

            <mat-card>
              <table mat-table [dataSource]="incidentes()">
                <ng-container matColumnDef="tipo"><th mat-header-cell *matHeaderCellDef>Tipo</th>
                  <td mat-cell *matCellDef="let i"><span class="chip muted-chip">{{ i.tipo }}</span></td></ng-container>
                <ng-container matColumnDef="desc"><th mat-header-cell *matHeaderCellDef>Observación</th>
                  <td mat-cell *matCellDef="let i">{{ i.descripcion || '—' }}</td></ng-container>
                <ng-container matColumnDef="dia"><th mat-header-cell *matHeaderCellDef>Día</th>
                  <td mat-cell *matCellDef="let i">{{ dias[i.dia_semana] }}</td></ng-container>
                <ng-container matColumnDef="hora"><th mat-header-cell *matHeaderCellDef>Hora</th>
                  <td mat-cell *matCellDef="let i">{{ i.hora != null ? i.hora + ':00' : '—' }}</td></ng-container>
                <ng-container matColumnDef="ref"><th mat-header-cell *matHeaderCellDef>Pedido</th>
                  <td mat-cell *matCellDef="let i">{{ i.tracking_ref || '—' }}</td></ng-container>
                <ng-container matColumnDef="gps"><th mat-header-cell *matHeaderCellDef>GPS</th>
                  <td mat-cell *matCellDef="let i" class="mono">{{ i.gps_lat | number: '1.3-3' }}, {{ i.gps_lng | number: '1.3-3' }}</td></ng-container>
                <tr mat-header-row *matHeaderRowDef="colsInc"></tr>
                <tr mat-row *matRowDef="let row; columns: colsInc"></tr>
              </table>
              @if (incidentes().length === 0) {
                <div class="vacio"><mat-icon>report_off</mat-icon><p>Sin incidentes reportados.</p></div>
              }
            </mat-card>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [
    `
      .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px; }
      .kpi { display: flex; align-items: center; gap: 16px; padding: 18px 20px; }
      .kpi .ico { width: 48px; height: 48px; border-radius: 12px; background: var(--accent-soft); color: var(--accent);
        display: grid; place-items: center; }
      .kpi .ico.warn { background: rgba(180,83,9,.14); color: var(--warn); }
      .kpi .ico mat-icon { font-size: 26px; height: 26px; width: 26px; }
      .kpi .num { font-family: 'Fraunces', Georgia, serif; font-size: 32px; font-weight: 600; color: var(--ink); line-height: 1; }
      .kpi .lbl { color: var(--muted); font-size: 13px; margin-top: 4px; }
      .tabs { margin-top: 4px; }
      .tab-body { padding: 20px 2px 4px; }
      .leyenda { display: flex; align-items: center; gap: 8px; color: var(--ink-2); font-size: 13.5px; margin: 0 0 16px; }
      .leyenda mat-icon { color: var(--accent); font-size: 20px; height: 20px; width: 20px; }
      .dist { display: flex; gap: 36px; flex-wrap: wrap; margin-bottom: 18px; }
      .dist-col { flex: 1; min-width: 280px; }
      .dist-col h4 { margin: 0 0 10px; font-size: 13px; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
      .bar { display: grid; grid-template-columns: 160px 1fr 44px; align-items: center; gap: 10px; margin: 7px 0; font-size: 13px; }
      .bar-k { display: flex; align-items: center; gap: 7px; color: var(--ink-2); }
      .bar-v { text-align: right; color: var(--muted); font-weight: 600; }
      .track { height: 9px; background: var(--surface-2); border-radius: 6px; overflow: hidden; }
      .fill { height: 100%; border-radius: 6px; background: var(--ink); }
      .fill.neutral { background: var(--muted); }
      .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--muted); }
      /* Color SÓLIDO solo en dot/fill (barras) — NO se filtra a los chips. */
      .dot.r-ALTO, .fill.r-ALTO { background: var(--bad) !important; }
      .dot.r-MEDIO, .fill.r-MEDIO { background: var(--warn) !important; }
      .dot.r-BAJO, .fill.r-BAJO { background: var(--ok) !important; }
      .dot.g-ALTA_DEMANDA, .fill.g-ALTA_DEMANDA { background: var(--ok) !important; }
      .dot.g-RETRASOS_FRECUENTES, .fill.g-RETRASOS_FRECUENTES { background: var(--bad) !important; }
      .dot.g-BAJA_DEMANDA, .fill.g-BAJA_DEMANDA { background: var(--muted) !important; }
      /* Chips: fondo de color suave + TEXTO NEGRO (legible). */
      .chip { display: inline-flex; padding: 4px 11px; border-radius: 999px; font-size: 12px; font-weight: 700; color: #1c1917; }
      .chip.r-ALTO, .chip.g-RETRASOS_FRECUENTES { background: rgba(161,59,47,.28); }
      .chip.r-MEDIO { background: rgba(180,83,9,.28); }
      .chip.r-BAJO, .chip.g-ALTA_DEMANDA { background: rgba(77,124,74,.30); }
      .chip.g-BAJA_DEMANDA { background: var(--surface-2); }
      .muted-chip { background: var(--surface-2); color: #1c1917; }
      .filtro { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; flex-wrap: wrap; font-size: 13px; }
      .muted { color: var(--muted); font-size: 12.5px; }
      .zona-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
      .mini { font-size: 18px; height: 18px; width: 18px; }
      .mini.ok { color: var(--ok); } .mini.no { color: var(--bad); }
      .mono { font-family: ui-monospace, monospace; font-size: 12px; color: var(--ink-2); }
    `,
  ],
})
export class DatasetsComponent {
  private ds = inject(Ms3DatasetsService);
  private snack = inject(MatSnackBar);

  dias = DIAS;
  colsEnvios = ['ref', 'peso', 'distancia', 'servicio', 'zona', 'hora', 'dia', 'aTiempo', 'riesgo'];
  colsZonas = ['nombre', 'codigo', 'envios', 'tiempo', 'incidencias', 'grupo'];
  colsSuc = ['nombre', 'departamento', 'ciudad', 'gps', 'activa'];
  colsInc = ['tipo', 'desc', 'dia', 'hora', 'ref', 'gps'];

  resumen = signal<ResumenDataset | null>(null);
  sucursales = signal<Sucursal[]>([]);
  zonas = signal<ZonaMetrica[]>([]);
  envios = signal<EnvioHistorico[]>([]);
  incidentes = signal<IncidenteZona[]>([]);
  filtroRiesgo = signal<string>('');
  cargando = signal(false);

  distRiesgo = computed(() => this.dist(this.resumen()?.envios_por_riesgo, ['BAJO', 'MEDIO', 'ALTO']));
  distServicio = computed(() => this.dist(this.resumen()?.envios_por_servicio));
  distGrupo = computed(() =>
    this.dist(this.resumen()?.zonas_por_grupo, ['ALTA_DEMANDA', 'RETRASOS_FRECUENTES', 'BAJA_DEMANDA']),
  );
  distIncTipo = computed(() => this.dist(this.resumen()?.incidentes_por_tipo));
  distIncDia = computed(() => this.dist(this.resumen()?.incidentes_por_dia, DIAS));

  constructor() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.ds.resumen().subscribe({ next: (r) => this.resumen.set(r), error: (e) => this.err(e) });
    this.ds.sucursales().subscribe({ next: (s) => this.sucursales.set(s), error: () => {} });
    this.ds.zonas().subscribe({ next: (z) => this.zonas.set(z), error: () => {} });
    this.ds.incidentes().subscribe({ next: (i) => this.incidentes.set(i), error: () => {} });
    this.cargarEnvios();
  }

  cargarEnvios() {
    this.cargando.set(true);
    this.ds.envios(150, this.filtroRiesgo() || undefined).subscribe({
      next: (e) => { this.envios.set(e); this.cargando.set(false); },
      error: (e) => this.err(e),
    });
  }

  setFiltro(v: string) {
    this.filtroRiesgo.set(v);
    this.cargarEnvios();
  }

  reclasificar() {
    this.cargando.set(true);
    this.ds.reclasificarZonas().subscribe({
      next: (z) => {
        this.zonas.set(z);
        this.cargando.set(false);
        this.snack.open('Zonas reclasificadas con K-Means', 'Cerrar', { duration: 3000 });
        this.ds.resumen().subscribe({ next: (r) => this.resumen.set(r) });
      },
      error: (e) => this.err(e),
    });
  }

  etiquetaGrupo(g: string): string {
    return ({ ALTA_DEMANDA: 'Alta demanda', RETRASOS_FRECUENTES: 'Retrasos frecuentes', BAJA_DEMANDA: 'Baja demanda' } as Record<string, string>)[g] ?? g;
  }

  private dist(obj: Record<string, number> | undefined, orden?: string[]) {
    if (!obj) return [];
    const total = Object.values(obj).reduce((a, b) => a + b, 0) || 1;
    const claves = orden ? orden.filter((k) => k in obj) : Object.keys(obj);
    return claves.map((k) => ({ k, v: obj[k], pct: (obj[k] / total) * 100 }));
  }

  private err(e: any) {
    this.cargando.set(false);
    const msg = e?.status === 401 ? 'Inicia sesión de nuevo'
      : e?.status === 403 ? 'Requiere ADMIN'
      : e?.status === 0 ? 'No se pudo contactar al MS3 (¿está corriendo?)'
      : e?.error?.detail ?? 'Error al cargar datasets';
    this.snack.open(msg, 'Cerrar', { duration: 4000 });
  }
}
