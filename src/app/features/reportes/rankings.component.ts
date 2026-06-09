import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import {
  Ms3ReportesService,
  ReporteRankings,
  RankingClienteDetalle,
  Par,
} from '../../services/ms3-reportes.service';
import { BarChartComponent, DatoChart } from '../../shared/charts';
import { ReportShellComponent } from '../../shared/report-shell.component';
import { ReporteExport, SeccionExport } from '../../shared/report-export.service';
import { FiltrosReporte, ReportFiltersComponent } from '../../shared/report-filters.component';

// Hoja BI: Rankings / Top (mayores clientes, servicios, zonas, rutas, sucursales) — MS3.
// Filtros por dimensiones + drill-down interactivo al hacer click en un cliente.
@Component({
  selector: 'app-reportes-rankings',
  standalone: true,
  imports: [CommonModule, DecimalPipe, BarChartComponent, ReportShellComponent, ReportFiltersComponent],
  template: `
    <app-report-shell titulo="Rankings y tops" subtitulo="Mayores clientes, servicios, zonas, rutas y sucursales (MS3)" [build]="build">
      <app-report-filters (cambio)="aplicar($event)"></app-report-filters>

      @if (rep(); as r) {
        <div class="grid" [class.con-panel]="sel()">
          <section class="panel">
            <h3>Mayores clientes <span class="hint">(click para ver detalle)</span></h3>
            <div class="cli-list">
              @for (c of cli(); track c.label; let i = $index) {
                <button class="cli" [class.activo]="c.label === sel()" (click)="abrir(c.label)">
                  <span class="nm" [title]="c.label">{{ c.label }}</span>
                  <span class="track"><span class="fill" [style.width.%]="pct(c.value)"></span></span>
                  <span class="vl">{{ c.value | number }}</span>
                </button>
              }
              @if (!cli().length) { <p class="vacio">Sin datos.</p> }
            </div>
          </section>

          <section class="panel">
            <h3>Tipos de envío más usados</h3>
            <app-bar-chart [data]="srv()"></app-bar-chart>
          </section>
          <section class="panel">
            <h3>Zonas con más envíos</h3>
            <app-bar-chart [data]="zon()"></app-bar-chart>
          </section>
          <section class="panel">
            <h3>Rutas más transitadas</h3>
            <app-bar-chart [data]="rut()" [style.--lbl-w]="'210px'"></app-bar-chart>
          </section>
          <section class="panel wide">
            <h3>Sucursales más activas</h3>
            <app-bar-chart [data]="suc()"></app-bar-chart>
          </section>
        </div>
      } @else {
        <p class="vacio">Cargando rankings…</p>
      }
    </app-report-shell>

    <!-- Panel lateral de drill-down del cliente -->
    @if (sel()) {
      <div class="overlay" (click)="cerrar()"></div>
      <aside class="drawer">
        <header class="dh">
          <div>
            <span class="lab">Cliente</span>
            <h3>{{ sel() }}</h3>
          </div>
          <button class="x" (click)="cerrar()">✕</button>
        </header>

        @if (detalle(); as d) {
          <div class="dk">
            <div><b>{{ d.total_envios | number }}</b><span>Envíos</span></div>
            <div class="ok"><b>{{ d.entregados_a_tiempo_pct | number: '1.0-1' }}%</b><span>A tiempo</span></div>
            <div><b>{{ d.distancia_prom_km | number: '1.0-0' }}</b><span>km prom.</span></div>
          </div>

          <h4>Tipos de envío</h4>
          <app-bar-chart [data]="par(d.por_servicio)"></app-bar-chart>
          <h4>Zonas con más envíos</h4>
          <app-bar-chart [data]="par(d.por_zona)"></app-bar-chart>
          <h4>Rutas más usadas</h4>
          <app-bar-chart [data]="par(d.por_rutas)" [style.--lbl-w]="'180px'"></app-bar-chart>
          <h4>Riesgo de retraso</h4>
          <app-bar-chart [data]="par(d.por_riesgo)"></app-bar-chart>
        } @else {
          <p class="vacio" style="padding:18px">Cargando detalle…</p>
        }
      </aside>
    }
  `,
  styles: [`
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .panel { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; }
    .panel.wide { grid-column: 1 / -1; }
    .panel h3 { font-size: 15px; font-weight: 700; color: var(--ink); margin: 0 0 14px; }
    .panel h3 .hint { font-size: 11.5px; font-weight: 500; color: var(--muted); }
    .vacio { color: var(--muted); }

    .cli-list { display: flex; flex-direction: column; gap: 3px; }
    .cli { display: grid; grid-template-columns: 150px 1fr 70px; align-items: center; gap: 10px; width: 100%; border: 0; background: transparent; cursor: pointer; font: inherit; font-size: 13px; padding: 6px 8px; border-radius: 8px; text-align: left; }
    .cli:hover { background: var(--surface-2); }
    .cli.activo { background: var(--accent-soft); }
    .cli .nm { color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cli.activo .nm { color: var(--accent); font-weight: 700; }
    .cli .track { height: 10px; background: var(--surface-2); border-radius: 6px; overflow: hidden; }
    .cli.activo .track { background: rgba(168,104,47,.2); }
    .cli .fill { display: block; height: 100%; border-radius: 6px; background: var(--accent); min-width: 2px; transition: width .3s ease; }
    .cli .vl { text-align: right; color: var(--muted); font-weight: 600; }

    .overlay { position: fixed; inset: 0; background: rgba(28,25,23,.34); z-index: 30; animation: fade .15s ease; }
    .drawer { position: fixed; top: 0; right: 0; height: 100vh; width: 420px; max-width: 92vw; background: var(--surface); border-left: 1px solid var(--line); box-shadow: -16px 0 40px -24px rgba(0,0,0,.5); z-index: 31; overflow-y: auto; padding: 0 20px 28px; animation: slide .2s ease; }
    .dh { position: sticky; top: 0; background: var(--surface); display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 0 14px; border-bottom: 1px solid var(--line); margin-bottom: 14px; }
    .dh .lab { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
    .dh h3 { font-family: 'Fraunces', Georgia, serif; font-size: 21px; font-weight: 600; color: var(--ink); margin: 3px 0 0; }
    .x { border: 0; background: var(--surface-2); width: 32px; height: 32px; border-radius: 9px; cursor: pointer; font-size: 14px; color: var(--ink-2); }
    .x:hover { background: var(--line); }
    .dk { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 8px; }
    .dk > div { background: var(--surface-2); border-radius: 11px; padding: 11px 12px; }
    .dk b { display: block; font-family: 'Fraunces', Georgia, serif; font-size: 21px; font-weight: 600; color: var(--ink); line-height: 1.1; }
    .dk span { font-size: 11px; color: var(--muted); }
    .dk .ok b { color: var(--ok, #4d7c4a); }
    .drawer h4 { font-size: 13px; font-weight: 700; color: var(--ink); margin: 18px 0 8px; }

    @keyframes fade { from { opacity: 0; } }
    @keyframes slide { from { transform: translateX(30px); opacity: .6; } }
    @media (max-width: 780px) { .grid { grid-template-columns: 1fr; } }
  `],
})
export class ReportesRankingsComponent {
  private api = inject(Ms3ReportesService);
  rep = signal<ReporteRankings | null>(null);
  private filtros: FiltrosReporte = {};

  sel = signal<string | null>(null);                 // cliente seleccionado
  detalle = signal<RankingClienteDetalle | null>(null);

  constructor() {
    this.cargar();
  }

  private cargar() {
    this.api.rankings(this.filtros).subscribe((r) => this.rep.set(r));
  }

  aplicar(f: FiltrosReporte) {
    this.filtros = f;
    this.cargar();
    // Si hay un cliente abierto, recargar su detalle con los nuevos filtros.
    if (this.sel()) this.abrir(this.sel()!);
  }

  abrir(nombre: string) {
    this.sel.set(nombre);
    this.detalle.set(null);
    this.api.rankingCliente(nombre, this.filtros).subscribe({
      next: (d) => this.detalle.set(d),
      error: () => this.detalle.set(null),
    });
  }

  cerrar() {
    this.sel.set(null);
    this.detalle.set(null);
  }

  private d(pares?: Par[]): DatoChart[] {
    return (pares ?? []).map((p) => ({ label: p.clave, value: p.valor }));
  }
  par(pares?: Par[]): DatoChart[] {
    return this.d(pares);
  }
  cli = computed(() => this.d(this.rep()?.top_clientes));
  srv = computed(() => this.d(this.rep()?.top_servicios));
  zon = computed(() => this.d(this.rep()?.top_zonas));
  rut = computed(() => this.d(this.rep()?.top_rutas));
  suc = computed(() => this.d(this.rep()?.top_sucursales));

  pct(v: number): number {
    const m = Math.max(...this.cli().map((c) => c.value), 1);
    return (v / m) * 100;
  }

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
