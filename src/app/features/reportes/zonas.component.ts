import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Ms3DatasetsService, ResumenDataset, ZonaMetrica } from '../../services/ms3-datasets.service';
import { BarChartComponent, DonutChartComponent, DatoChart } from '../../shared/charts';
import { ReportShellComponent } from '../../shared/report-shell.component';
import { ReporteExport } from '../../shared/report-export.service';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const diaNombre = (k: string) => DIAS[+k] ?? k;

// Hoja BI: Zonas e incidentes (datos del MS3).
@Component({
  selector: 'app-reportes-zonas',
  standalone: true,
  imports: [CommonModule, DecimalPipe, BarChartComponent, DonutChartComponent, ReportShellComponent],
  template: `
    <app-report-shell titulo="Zonas e incidentes" subtitulo="Clasificación de zonas y eventos de campo (MS3)" [build]="build">
      @if (res(); as r) {
        <div class="kpis">
          <div class="kpi"><span class="v">{{ r.zonas | number }}</span><span class="l">Zonas monitoreadas</span></div>
          <div class="kpi"><span class="v">{{ r.sucursales | number }}</span><span class="l">Sucursales</span></div>
          <div class="kpi"><span class="v">{{ r.incidentes | number }}</span><span class="l">Incidentes reportados</span></div>
          <div class="kpi"><span class="v">{{ r.envios_historicos | number }}</span><span class="l">Envíos en dataset</span></div>
        </div>

        <div class="grid">
          <section class="panel">
            <h3>Zonas por grupo (K-Means)</h3>
            <app-donut-chart [data]="grupos()" caption="zonas"></app-donut-chart>
          </section>
          <section class="panel">
            <h3>Incidentes por tipo</h3>
            <app-donut-chart [data]="tipos()" caption="incidentes"></app-donut-chart>
          </section>
          <section class="panel wide">
            <h3>Incidentes por día de la semana</h3>
            <app-bar-chart [data]="dias()"></app-bar-chart>
          </section>

          <section class="panel wide">
            <h3>Detalle de zonas</h3>
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
  res = signal<ResumenDataset | null>(null);
  zonas = signal<ZonaMetrica[]>([]);

  constructor() {
    this.api.resumen().subscribe((r) => this.res.set(r));
    this.api.zonas().subscribe((z) => this.zonas.set(z.sort((a, b) => b.num_envios - a.num_envios)));
  }

  private pares(rec?: Record<string, number>, mapKey?: (k: string) => string): DatoChart[] {
    return Object.entries(rec ?? {}).map(([k, value]) => ({ label: mapKey ? mapKey(k) : k, value }));
  }
  grupos = computed(() => this.pares(this.res()?.zonas_por_grupo));
  tipos = computed(() => this.pares(this.res()?.incidentes_por_tipo).sort((a, b) => b.value - a.value));
  dias = computed(() => {
    const rec = this.res()?.incidentes_por_dia ?? {};
    return DIAS.map((label, i) => ({ label, value: rec[String(i)] ?? 0 }));
  });

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
            { label: 'Incidentes reportados', valor: n(r?.incidentes ?? 0) },
            { label: 'Envíos en dataset', valor: n(r?.envios_historicos ?? 0) },
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
