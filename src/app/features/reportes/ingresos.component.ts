import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Apollo, gql } from 'apollo-angular';
import { BarChartComponent, DonutChartComponent, LineChartComponent, DatoChart } from '../../shared/charts';
import { ReportShellComponent } from '../../shared/report-shell.component';
import { ReporteExport } from '../../shared/report-export.service';

interface ParValor { clave: string; valor: number; }
interface Reporte {
  totalIngresos: number;
  cantidadIngresos: number;
  ticketPromedio: number;
  totalClientes: number;
  totalServicios: number;
  ingresosPorServicio: ParValor[];
  enviosPorServicio: ParValor[];
  ingresosPorMes: ParValor[];
  ingresosPorDia: ParValor[];
}

const REPORTES = gql`
  query Reportes {
    reportes {
      totalIngresos
      cantidadIngresos
      ticketPromedio
      totalClientes
      totalServicios
      ingresosPorServicio { clave valor }
      enviosPorServicio { clave valor }
      ingresosPorMes { clave valor }
      ingresosPorDia { clave valor }
    }
  }
`;

// Hoja BI: Ingresos (datos empresariales del MS1 vía GraphQL).
@Component({
  selector: 'app-reportes-ingresos',
  standalone: true,
  imports: [CommonModule, DecimalPipe, BarChartComponent, DonutChartComponent, LineChartComponent, ReportShellComponent],
  template: `
    <app-report-shell titulo="Ingresos y facturación" subtitulo="Resultados empresariales del courier (MS1)" [build]="build">
      @if (rep(); as r) {
        <div class="kpis">
          <div class="kpi"><span class="v">Bs {{ r.totalIngresos | number: '1.0-0' }}</span><span class="l">Ingresos totales</span></div>
          <div class="kpi"><span class="v">{{ r.cantidadIngresos | number }}</span><span class="l">Facturas emitidas</span></div>
          <div class="kpi"><span class="v">Bs {{ r.ticketPromedio | number: '1.2-2' }}</span><span class="l">Ticket promedio</span></div>
          <div class="kpi"><span class="v">{{ r.totalClientes | number }}</span><span class="l">Clientes</span></div>
          <div class="kpi"><span class="v">{{ r.totalServicios | number }}</span><span class="l">Servicios</span></div>
        </div>

        <div class="grid">
          <section class="panel">
            <h3>Ingresos por servicio</h3>
            <app-donut-chart [data]="ingServ()" caption="Bs"></app-donut-chart>
          </section>
          <section class="panel">
            <h3>Envíos por servicio</h3>
            <app-bar-chart [data]="envServ()"></app-bar-chart>
          </section>
          <section class="panel wide">
            <h3>Ingresos por mes (Bs)</h3>
            <app-line-chart [data]="porMes()"></app-line-chart>
          </section>

          <section class="panel wide">
            <h3>Detalle por servicio</h3>
            <table class="tbl">
              <thead><tr><th>Servicio</th><th class="r">Ingresos (Bs)</th><th class="r">Envíos</th></tr></thead>
              <tbody>
                @for (f of detalle(); track f.servicio) {
                  <tr><td>{{ f.servicio }}</td><td class="r">{{ f.ingreso | number: '1.2-2' }}</td><td class="r">{{ f.envios | number }}</td></tr>
                }
              </tbody>
            </table>
          </section>
        </div>
      } @else {
        <p class="vacio">Cargando ingresos…</p>
      }
    </app-report-shell>
  `,
  styles: [`
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 18px; }
    .kpi { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; }
    .kpi .v { display: block; font-family: 'Fraunces', Georgia, serif; font-size: 24px; font-weight: 700; color: var(--ink); }
    .kpi .l { display: block; color: var(--muted); font-size: 12.5px; margin-top: 3px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .panel { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; }
    .panel.wide { grid-column: 1 / -1; }
    .panel h3 { font-size: 15px; font-weight: 700; color: var(--ink); margin: 0 0 14px; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th, .tbl td { border-bottom: 1px solid var(--line); padding: 8px 10px; text-align: left; }
    .tbl th { color: var(--muted); font-weight: 700; }
    .tbl .r { text-align: right; }
    .vacio { color: var(--muted); }
    @media (max-width: 780px) { .grid { grid-template-columns: 1fr; } }
  `],
})
export class ReportesIngresosComponent {
  private apollo = inject(Apollo);
  rep = signal<Reporte | null>(null);

  constructor() {
    this.apollo.query<{ reportes: Reporte }>({ query: REPORTES }).subscribe((res) => this.rep.set(res.data?.reportes ?? null));
  }

  private d(p?: ParValor[]): DatoChart[] { return (p ?? []).map((x) => ({ label: x.clave, value: x.valor })); }
  ingServ = computed(() => this.d(this.rep()?.ingresosPorServicio).sort((a, b) => b.value - a.value));
  envServ = computed(() => this.d(this.rep()?.enviosPorServicio).sort((a, b) => b.value - a.value));
  porMes = computed(() => this.d(this.rep()?.ingresosPorMes));
  detalle = computed(() => {
    const env = new Map((this.rep()?.enviosPorServicio ?? []).map((x) => [x.clave, x.valor]));
    return (this.rep()?.ingresosPorServicio ?? [])
      .map((x) => ({ servicio: x.clave, ingreso: x.valor, envios: env.get(x.clave) ?? 0 }))
      .sort((a, b) => b.ingreso - a.ingreso);
  });

  build = (): ReporteExport => {
    const r = this.rep();
    const n = (x: number, d = 0) => x?.toLocaleString('es', { minimumFractionDigits: d, maximumFractionDigits: d }) ?? '0';
    return {
      titulo: 'Ingresos y facturación',
      subtitulo: 'Resultados empresariales del courier (MS1)',
      secciones: [
        {
          titulo: 'Indicadores clave', tipo: 'kpis', kpis: [
            { label: 'Ingresos totales', valor: `Bs ${n(r?.totalIngresos ?? 0)}` },
            { label: 'Facturas emitidas', valor: n(r?.cantidadIngresos ?? 0) },
            { label: 'Ticket promedio', valor: `Bs ${n(r?.ticketPromedio ?? 0, 2)}` },
            { label: 'Clientes', valor: n(r?.totalClientes ?? 0) },
            { label: 'Servicios', valor: n(r?.totalServicios ?? 0) },
          ],
        },
        { titulo: 'Detalle por servicio', tipo: 'tabla', columnas: ['Servicio', 'Ingresos (Bs)', 'Envíos'], filas: this.detalle().map((f) => [f.servicio, f.ingreso.toFixed(2), f.envios]) },
        { titulo: 'Ingresos por mes', tipo: 'tabla', columnas: ['Mes', 'Ingresos (Bs)'], filas: this.porMes().map((d) => [d.label, d.value.toFixed(2)]) },
      ],
    };
  };
}
