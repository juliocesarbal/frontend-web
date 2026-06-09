import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Ms3ReportesService, ReporteRankings, Par } from '../../services/ms3-reportes.service';
import { BarChartComponent, DatoChart } from '../../shared/charts';
import { ReportShellComponent } from '../../shared/report-shell.component';
import { ReporteExport, SeccionExport } from '../../shared/report-export.service';

// Hoja BI: Rankings / Top (mayores clientes, servicios, zonas, rutas, sucursales) — MS3.
@Component({
  selector: 'app-reportes-rankings',
  standalone: true,
  imports: [CommonModule, DecimalPipe, BarChartComponent, ReportShellComponent],
  template: `
    <app-report-shell titulo="Rankings y tops" subtitulo="Mayores clientes, servicios, zonas, rutas y sucursales (MS3)" [build]="build">
      @if (rep(); as r) {
        <div class="grid">
          <section class="panel">
            <h3>🏆 Mayores clientes</h3>
            <app-bar-chart [data]="cli()"></app-bar-chart>
          </section>
          <section class="panel">
            <h3>📦 Tipos de envío más usados</h3>
            <app-bar-chart [data]="srv()"></app-bar-chart>
          </section>
          <section class="panel">
            <h3>🗺️ Zonas con más envíos</h3>
            <app-bar-chart [data]="zon()"></app-bar-chart>
          </section>
          <section class="panel">
            <h3>🚚 Rutas más transitadas</h3>
            <app-bar-chart [data]="rut()" [style.--lbl-w]="'210px'"></app-bar-chart>
          </section>
          <section class="panel wide">
            <h3>🏢 Sucursales más activas</h3>
            <app-bar-chart [data]="suc()"></app-bar-chart>
          </section>
        </div>
      } @else {
        <p class="vacio">Cargando rankings…</p>
      }
    </app-report-shell>
  `,
  styles: [`
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .panel { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; }
    .panel.wide { grid-column: 1 / -1; }
    .panel h3 { font-size: 15px; font-weight: 700; color: var(--ink); margin: 0 0 14px; }
    .vacio { color: var(--muted); }
    @media (max-width: 780px) { .grid { grid-template-columns: 1fr; } }
  `],
})
export class ReportesRankingsComponent {
  private api = inject(Ms3ReportesService);
  rep = signal<ReporteRankings | null>(null);

  constructor() {
    this.api.rankings().subscribe((r) => this.rep.set(r));
  }

  private d(pares?: Par[]): DatoChart[] {
    return (pares ?? []).map((p) => ({ label: p.clave, value: p.valor }));
  }
  cli = computed(() => this.d(this.rep()?.top_clientes));
  srv = computed(() => this.d(this.rep()?.top_servicios));
  zon = computed(() => this.d(this.rep()?.top_zonas));
  rut = computed(() => this.d(this.rep()?.top_rutas));
  suc = computed(() => this.d(this.rep()?.top_sucursales));

  build = (): ReporteExport => {
    const sec = (titulo: string, data: DatoChart[]): SeccionExport => ({ titulo, tipo: 'barras', barras: data });
    return {
      titulo: 'Rankings y tops',
      subtitulo: 'Mayores clientes, servicios, zonas, rutas y sucursales (MS3)',
      secciones: [
        sec('Mayores clientes', this.cli()),
        sec('Tipos de envío más usados', this.srv()),
        sec('Zonas con más envíos', this.zon()),
        sec('Rutas más transitadas', this.rut()),
        sec('Sucursales más activas', this.suc()),
      ],
    };
  };
}
