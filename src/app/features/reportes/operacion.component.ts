import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Ms3ReportesService, ReporteOperacion } from '../../services/ms3-reportes.service';
import { BarChartComponent, DonutChartComponent, LineChartComponent, DatoChart } from '../../shared/charts';
import { ReportShellComponent } from '../../shared/report-shell.component';
import { ReporteExport } from '../../shared/report-export.service';

// Hoja BI: Envíos / Operación (datos del MS3).
@Component({
  selector: 'app-reportes-operacion',
  standalone: true,
  imports: [CommonModule, DecimalPipe, BarChartComponent, DonutChartComponent, LineChartComponent, ReportShellComponent],
  template: `
    <app-report-shell titulo="Envíos y operación" subtitulo="Indicadores logísticos del courier (MS3)" [build]="build">
      @if (rep(); as r) {
        <div class="kpis">
          <div class="kpi"><span class="v">{{ r.total_envios | number }}</span><span class="l">Envíos totales</span></div>
          <div class="kpi"><span class="v">{{ r.distancia_prom_km | number: '1.0-0' }} km</span><span class="l">Distancia promedio</span></div>
          <div class="kpi"><span class="v">{{ r.tiempo_prom_h | number: '1.1-1' }} h</span><span class="l">Tiempo promedio</span></div>
          <div class="kpi ok"><span class="v">{{ r.entregados_a_tiempo_pct | number: '1.1-1' }}%</span><span class="l">Entregados a tiempo</span></div>
        </div>

        <div class="grid">
          <section class="panel">
            <h3>Envíos por tipo de servicio</h3>
            <app-donut-chart [data]="servicio()" caption="envíos"></app-donut-chart>
          </section>
          <section class="panel">
            <h3>Distribución por riesgo de retraso</h3>
            <app-donut-chart [data]="riesgo()" caption="envíos"></app-donut-chart>
          </section>
          <section class="panel wide">
            <h3>Evolución mensual de envíos</h3>
            <app-line-chart [data]="mes()"></app-line-chart>
          </section>
          <section class="panel wide">
            <h3>Envíos por zona</h3>
            <app-bar-chart [data]="zona()"></app-bar-chart>
          </section>
        </div>
      } @else {
        <p class="vacio">Cargando datos de operación…</p>
      }
    </app-report-shell>
  `,
  styles: [`
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px; margin-bottom: 18px; }
    .kpi { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; }
    .kpi .v { display: block; font-family: 'Fraunces', Georgia, serif; font-size: 28px; font-weight: 700; color: var(--ink); }
    .kpi .l { display: block; color: var(--muted); font-size: 12.5px; margin-top: 3px; }
    .kpi.ok .v { color: var(--ok, #4d7c4a); }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .panel { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; }
    .panel.wide { grid-column: 1 / -1; }
    .panel h3 { font-size: 15px; font-weight: 700; color: var(--ink); margin: 0 0 14px; }
    .vacio { color: var(--muted); }
    @media (max-width: 780px) { .grid { grid-template-columns: 1fr; } }
  `],
})
export class ReportesOperacionComponent {
  private api = inject(Ms3ReportesService);
  rep = signal<ReporteOperacion | null>(null);

  constructor() {
    this.api.operacion().subscribe((r) => this.rep.set(r));
  }

  private pares(rec?: Record<string, number>): DatoChart[] {
    return Object.entries(rec ?? {}).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  }
  servicio = computed(() => this.pares(this.rep()?.por_servicio));
  riesgo = computed(() => this.pares(this.rep()?.por_riesgo));
  zona = computed(() => this.pares(this.rep()?.por_zona));
  mes = computed(() => Object.entries(this.rep()?.por_mes ?? {}).sort((a, b) => a[0].localeCompare(b[0])).map(([label, value]) => ({ label, value })));

  build = (): ReporteExport => {
    const r = this.rep();
    const n = (x: number, d = 0) => x?.toLocaleString('es', { minimumFractionDigits: d, maximumFractionDigits: d }) ?? '0';
    return {
      titulo: 'Envíos y operación',
      subtitulo: 'Indicadores logísticos del courier (MS3)',
      secciones: [
        {
          titulo: 'Indicadores clave', tipo: 'kpis', kpis: [
            { label: 'Envíos totales', valor: n(r?.total_envios ?? 0) },
            { label: 'Distancia promedio', valor: `${n(r?.distancia_prom_km ?? 0)} km` },
            { label: 'Tiempo promedio', valor: `${n(r?.tiempo_prom_h ?? 0, 1)} h` },
            { label: 'Entregados a tiempo', valor: `${n(r?.entregados_a_tiempo_pct ?? 0, 1)}%` },
          ],
        },
        { titulo: 'Envíos por tipo de servicio', tipo: 'barras', barras: this.servicio() },
        { titulo: 'Distribución por riesgo', tipo: 'barras', barras: this.riesgo() },
        { titulo: 'Envíos por zona', tipo: 'barras', barras: this.zona() },
        { titulo: 'Evolución mensual', tipo: 'tabla', columnas: ['Mes', 'Envíos'], filas: this.mes().map((d) => [d.label, d.value]) },
      ],
    };
  };
}
