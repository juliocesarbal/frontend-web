import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { Ms3ReportesService, ReporteOperacion } from '../../services/ms3-reportes.service';
import { DonutChartComponent, LineChartComponent, DatoChart } from '../../shared/charts';
import { ReportShellComponent } from '../../shared/report-shell.component';
import { ReporteExport } from '../../shared/report-export.service';
import { FiltrosReporte, ReportFiltersComponent } from '../../shared/report-filters.component';

interface ResumenMs1 {
  totalIngresos: number;
  cantidadIngresos: number;
  ticketPromedio: number;
  totalClientes: number;
  ingresosPorMes: { clave: string; valor: number }[];
}

const RESUMEN = gql`
  query ResumenBI($desde: String, $hasta: String) {
    reportes(desde: $desde, hasta: $hasta) {
      totalIngresos
      cantidadIngresos
      ticketPromedio
      totalClientes
      ingresosPorMes { clave valor }
    }
  }
`;

// Hoja BI: Resumen general — combina lo empresarial (MS1) y lo operativo (MS3).
@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, DecimalPipe, RouterLink, DonutChartComponent, LineChartComponent, ReportShellComponent, ReportFiltersComponent],
  template: `
    <app-report-shell titulo="Resumen general" subtitulo="Vista ejecutiva del courier · empresa (MS1) + operación (MS3)" [build]="build">
      <app-report-filters [dims]="['tiempo','dia','servicio','riesgo','sucursal']" (cambio)="aplicar($event)"></app-report-filters>
      <div class="kpis">
        @if (ms1(); as m) {
          <div class="kpi"><span class="v">Bs {{ m.totalIngresos | number: '1.0-0' }}</span><span class="l">Ingresos totales</span></div>
          <div class="kpi"><span class="v">Bs {{ m.ticketPromedio | number: '1.0-0' }}</span><span class="l">Ticket promedio</span></div>
          <div class="kpi"><span class="v">{{ m.totalClientes | number }}</span><span class="l">Clientes</span></div>
        }
        @if (ops(); as o) {
          <div class="kpi"><span class="v">{{ o.total_envios | number }}</span><span class="l">Envíos totales</span></div>
          <div class="kpi"><span class="v">{{ o.distancia_prom_km | number: '1.0-0' }} km</span><span class="l">Distancia promedio</span></div>
          <div class="kpi ok"><span class="v">{{ o.entregados_a_tiempo_pct | number: '1.1-1' }}%</span><span class="l">Entregas a tiempo</span></div>
        }
      </div>

      <div class="grid">
        <section class="panel">
          <h3>Ingresos por mes (Bs)</h3>
          <app-line-chart [data]="serieMs1()"></app-line-chart>
        </section>
        <section class="panel">
          <h3>Envíos por riesgo de retraso</h3>
          <app-donut-chart [data]="riesgo()" caption="envíos"></app-donut-chart>
        </section>
      </div>

      <h3 class="sec">Explorar reportes</h3>
      <div class="links">
        <a class="link" routerLink="/reportes/ingresos"><b>Ingresos y facturación</b><span>Resultados empresariales (MS1)</span></a>
        <a class="link" routerLink="/reportes/operacion"><b>Envíos y operación</b><span>Indicadores logísticos (MS3)</span></a>
        <a class="link" routerLink="/reportes/zonas"><b>Zonas e incidentes</b><span>Clasificación y eventos (MS3)</span></a>
        <a class="link" routerLink="/reportes/rankings"><b>Rankings y tops</b><span>Mayores clientes, servicios… (MS3)</span></a>
      </div>
    </app-report-shell>
  `,
  styles: [`
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 18px; }
    .kpi { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; }
    .kpi .v { display: block; font-family: 'Fraunces', Georgia, serif; font-size: 26px; font-weight: 700; color: var(--ink); }
    .kpi .l { display: block; color: var(--muted); font-size: 12.5px; margin-top: 3px; }
    .kpi.ok .v { color: var(--ok, #4d7c4a); }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .panel { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; }
    .panel h3 { font-size: 15px; font-weight: 700; color: var(--ink); margin: 0 0 14px; }
    .sec { font-family: 'Fraunces', Georgia, serif; font-size: 18px; color: var(--ink); margin: 26px 0 12px; }
    .links { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
    .link { display: flex; flex-direction: column; gap: 2px; text-decoration: none; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 16px 18px; transition: border-color .2s, transform .2s; }
    .link:hover { border-color: var(--accent); transform: translateY(-2px); }
    .link b { color: var(--ink); font-size: 14.5px; }
    .link span:last-child { color: var(--muted); font-size: 12.5px; }
    @media (max-width: 780px) { .grid { grid-template-columns: 1fr; } }
  `],
})
export class ReportesComponent {
  private apollo = inject(Apollo);
  private ms3 = inject(Ms3ReportesService);
  ms1 = signal<ResumenMs1 | null>(null);
  ops = signal<ReporteOperacion | null>(null);
  private filtros: FiltrosReporte = {};

  constructor() {
    this.cargar();
  }

  private cargar() {
    // MS1 solo filtra por fechas (desde/hasta como fecha); MS3 honra todos los filtros.
    this.apollo
      .query<{ reportes: ResumenMs1 }>({
        query: RESUMEN,
        variables: { desde: this.filtros.desde || null, hasta: this.filtros.hasta || null },
        fetchPolicy: 'network-only',
      })
      .subscribe((r) => this.ms1.set(r.data?.reportes ?? null));
    this.ms3.operacion(this.filtros).subscribe((o) => this.ops.set(o));
  }

  aplicar(f: FiltrosReporte) {
    this.filtros = f;
    this.cargar();
  }

  serieMs1 = computed<DatoChart[]>(() => (this.ms1()?.ingresosPorMes ?? []).map((x) => ({ label: x.clave, value: x.valor })));
  riesgo = computed<DatoChart[]>(() => Object.entries(this.ops()?.por_riesgo ?? {}).map(([label, value]) => ({ label, value })));

  build = (): ReporteExport => {
    const m = this.ms1();
    const o = this.ops();
    const n = (x: number, d = 0) => x?.toLocaleString('es', { minimumFractionDigits: d, maximumFractionDigits: d }) ?? '0';
    return {
      titulo: 'Resumen general',
      subtitulo: 'Vista ejecutiva del courier · empresa (MS1) + operación (MS3)',
      secciones: [
        {
          titulo: 'Indicadores clave', tipo: 'kpis', kpis: [
            { label: 'Ingresos totales', valor: `Bs ${n(m?.totalIngresos ?? 0)}` },
            { label: 'Ticket promedio', valor: `Bs ${n(m?.ticketPromedio ?? 0)}` },
            { label: 'Clientes', valor: n(m?.totalClientes ?? 0) },
            { label: 'Envíos totales', valor: n(o?.total_envios ?? 0) },
            { label: 'Distancia promedio', valor: `${n(o?.distancia_prom_km ?? 0)} km` },
            { label: 'Entregas a tiempo', valor: `${n(o?.entregados_a_tiempo_pct ?? 0, 1)}%` },
          ],
        },
        { titulo: 'Ingresos por mes', tipo: 'tabla', columnas: ['Mes', 'Ingresos (Bs)'], filas: this.serieMs1().map((d) => [d.label, d.value.toFixed(2)]) },
        { titulo: 'Envíos por riesgo', tipo: 'barras', barras: this.riesgo() },
      ],
    };
  };
}
