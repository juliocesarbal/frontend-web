import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Ms3DatasetsService, ResumenDataset, ZonaMetrica, IncidenteZona } from '../../services/ms3-datasets.service';
import { Ms3ReportesService, ReporteOperacion } from '../../services/ms3-reportes.service';
import { BarChartComponent, DonutChartComponent, DatoChart } from '../../shared/charts';
import { ReportShellComponent } from '../../shared/report-shell.component';
import { ReporteExport } from '../../shared/report-export.service';
import { FiltrosReporte, ReportFiltersComponent } from '../../shared/report-filters.component';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// Hoja BI: Zonas e incidentes (datos del MS3).
// La clasificación K-Means de zonas es global (no depende del tiempo); los filtros
// afectan el mix de envíos (riesgo/servicio, vía /operacion) y los incidentes (por día).
@Component({
  selector: 'app-reportes-zonas',
  standalone: true,
  imports: [CommonModule, DecimalPipe, BarChartComponent, DonutChartComponent, ReportShellComponent, ReportFiltersComponent],
  template: `
    <app-report-shell titulo="Zonas e incidentes" subtitulo="Clasificación de zonas y eventos de campo (MS3)" [build]="build">
      <app-report-filters [dims]="['tiempo','dia','servicio','riesgo','sucursal']" (cambio)="aplicar($event)"></app-report-filters>

      @if (res(); as r) {
        <div class="kpis">
          <div class="kpi"><span class="v">{{ r.zonas | number }}</span><span class="l">Zonas monitoreadas</span></div>
          <div class="kpi"><span class="v">{{ r.sucursales | number }}</span><span class="l">Sucursales</span></div>
          <div class="kpi"><span class="v">{{ incidentesFiltrados() | number }}</span><span class="l">Incidentes (filtro)</span></div>
          <div class="kpi"><span class="v">{{ enviosFiltrados() | number }}</span><span class="l">Envíos (filtro)</span></div>
        </div>

        <div class="grid">
          <section class="panel">
            <h3>Zonas por grupo (K-Means) <span class="hint">— clasificación global</span></h3>
            <app-donut-chart [data]="grupos()" caption="zonas"></app-donut-chart>
          </section>
          <section class="panel">
            <h3>Incidentes por tipo <span class="hint">— según filtros</span></h3>
            <app-donut-chart [data]="tipos()" caption="incidentes"></app-donut-chart>
          </section>
          <section class="panel">
            <h3>Envíos por riesgo <span class="hint">— según filtros</span></h3>
            <app-donut-chart [data]="riesgo()" caption="envíos"></app-donut-chart>
          </section>
          <section class="panel">
            <h3>Incidentes por día <span class="hint">— según filtros</span></h3>
            <app-bar-chart [data]="dias()"></app-bar-chart>
          </section>

          <section class="panel wide">
            <h3>Detalle de incidentes ({{ incidentes().length | number }})</h3>
            <table class="tbl">
              <thead><tr><th>Tipo</th><th>Día</th><th>Hora</th><th>Descripción</th></tr></thead>
              <tbody>
                @for (i of incidentes().slice(0, 60); track i.id) {
                  <tr>
                    <td><span class="tag">{{ i.tipo }}</span></td>
                    <td>{{ dia(i.dia_semana) }}</td>
                    <td>{{ i.hora != null ? i.hora + ':00' : '—' }}</td>
                    <td>{{ i.descripcion || '—' }}</td>
                  </tr>
                }
                @if (!incidentes().length) { <tr><td colspan="4" class="vacio">Sin incidentes para los filtros.</td></tr> }
              </tbody>
            </table>
          </section>

          <section class="panel wide">
            <h3>Detalle de zonas <span class="hint">— clasificación global</span></h3>
            <table class="tbl">
              <thead><tr><th>Zona</th><th>Grupo</th><th class="r">Envíos</th><th class="r">T. entrega (h)</th><th class="r">Incidencias</th></tr></thead>
              <tbody>
                @for (z of zonas(); track z.id) {
                  <tr>
                    <td>{{ z.nombre }}</td>
                    <td><span class="tag" [attr.data-g]="z.grupo">{{ z.grupo ?? '—' }}</span></td>
                    <td class="r">{{ z.num_envios | number }}</td>
                    <td class="r">{{ z.tiempo_entrega_prom | number: '1.1-1' }}</td>
                    <td class="r">{{ z.num_incidencias | number }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
        </div>
      } @else {
        <p class="vacio">Cargando zonas e incidentes…</p>
      }
    </app-report-shell>
  `,
  styles: [`
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px; margin-bottom: 18px; }
    .kpi { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; }
    .kpi .v { display: block; font-family: 'Fraunces', Georgia, serif; font-size: 28px; font-weight: 700; color: var(--ink); }
    .kpi .l { display: block; color: var(--muted); font-size: 12.5px; margin-top: 3px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .panel { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; }
    .panel.wide { grid-column: 1 / -1; }
    .panel h3 { font-size: 15px; font-weight: 700; color: var(--ink); margin: 0 0 14px; }
    .panel h3 .hint { font-size: 11px; font-weight: 500; color: var(--muted); }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th, .tbl td { border-bottom: 1px solid var(--line); padding: 8px 10px; text-align: left; }
    .tbl th { color: var(--muted); font-weight: 700; }
    .tbl .r { text-align: right; }
    .tag { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 20px; background: var(--surface-2); color: var(--ink-2); }
    .vacio { color: var(--muted); }
    @media (max-width: 780px) { .grid { grid-template-columns: 1fr; } }
  `],
})
export class ReportesZonasComponent {
  private api = inject(Ms3DatasetsService);
  private reportes = inject(Ms3ReportesService);
  res = signal<ResumenDataset | null>(null);
  zonas = signal<ZonaMetrica[]>([]);
  incidentes = signal<IncidenteZona[]>([]);
  private op = signal<ReporteOperacion | null>(null);
  private filtros: FiltrosReporte = {};

  constructor() {
    // Estáticos (clasificación global): se cargan una vez.
    this.api.resumen().subscribe((r) => this.res.set(r));
    this.api.zonas().subscribe((z) => this.zonas.set(z.sort((a, b) => b.num_envios - a.num_envios)));
    this.cargarFiltrable();
  }

  private cargarFiltrable() {
    // Incidentes filtrados por día (el endpoint soporta dia_semana).
    this.api.incidentes(this.filtros.dia_semana ?? undefined).subscribe((i) => this.incidentes.set(i));
    // Mix de envíos (riesgo/servicio) con todos los filtros, vía /operacion.
    this.reportes.operacion(this.filtros).subscribe((o) => this.op.set(o));
  }

  aplicar(f: FiltrosReporte) {
    this.filtros = f;
    this.cargarFiltrable();
  }

  dia(i: number) { return DIAS[i] ?? i; }

  private pares(rec?: Record<string, number>): DatoChart[] {
    return Object.entries(rec ?? {}).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }
  grupos = computed(() => this.pares(this.res()?.zonas_por_grupo));
  riesgo = computed(() => this.pares(this.op()?.por_riesgo));

  // Incidentes por tipo y por día se derivan de la lista filtrada (no del resumen global).
  tipos = computed(() => {
    const m = new Map<string, number>();
    for (const i of this.incidentes()) m.set(i.tipo, (m.get(i.tipo) ?? 0) + 1);
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  });
  dias = computed(() => {
    const c = new Array(7).fill(0);
    for (const i of this.incidentes()) c[i.dia_semana]++;
    return DIAS.map((label, idx) => ({ label, value: c[idx] }));
  });

  incidentesFiltrados = computed(() => this.incidentes().length);
  enviosFiltrados = computed(() => this.op()?.total_envios ?? 0);

  build = (): ReporteExport => {
    const r = this.res();
    const n = (x: number) => x?.toLocaleString('es') ?? '0';
    return {
      titulo: 'Zonas e incidentes',
      subtitulo: 'Clasificación de zonas y eventos de campo (MS3)',
      secciones: [
        {
          titulo: 'Indicadores clave', tipo: 'kpis', kpis: [
            { label: 'Zonas monitoreadas', valor: n(r?.zonas ?? 0) },
            { label: 'Sucursales', valor: n(r?.sucursales ?? 0) },
            { label: 'Incidentes (filtro)', valor: n(this.incidentesFiltrados()) },
            { label: 'Envíos (filtro)', valor: n(this.enviosFiltrados()) },
          ],
        },
        { titulo: 'Zonas por grupo (K-Means)', tipo: 'barras', barras: this.grupos() },
        { titulo: 'Incidentes por tipo', tipo: 'barras', barras: this.tipos() },
        { titulo: 'Incidentes por día', tipo: 'barras', barras: this.dias() },
        {
          titulo: 'Detalle de zonas', tipo: 'tabla',
          columnas: ['Zona', 'Grupo', 'Envíos', 'T. entrega (h)', 'Incidencias'],
          filas: this.zonas().map((z) => [z.nombre, z.grupo ?? '—', z.num_envios, z.tiempo_entrega_prom.toFixed(1), z.num_incidencias]),
        },
      ],
    };
  };
}
