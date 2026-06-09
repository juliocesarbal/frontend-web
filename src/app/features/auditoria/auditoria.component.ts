import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Ms2BitacoraService, Bitacora, BitacoraFiltros } from '../../services/ms2-bitacora.service';
import { ReportShellComponent } from '../../shared/report-shell.component';
import { ReporteExport } from '../../shared/report-export.service';

// Página de Auditoría: visualiza la bitácora (DynamoDB) del MS2. Solo ADMIN.
// Tabla + filtros (usuario, acción, recurso, rango de fechas) + KPIs + export.
@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, ReportShellComponent],
  template: `
    <app-report-shell titulo="Bitácora de auditoría" subtitulo="Eventos registrados en DynamoDB (MS2 Documental)" [build]="build">
      <!-- Filtros -->
      <div class="filtros">
        <div class="f">
          <label>Usuario</label>
          <input [(ngModel)]="f.usuario" placeholder="email o actor" />
        </div>
        <div class="f">
          <label>Acción</label>
          <select [(ngModel)]="f.accion">
            <option value="">Todas</option>
            @for (a of acciones; track a) { <option [value]="a">{{ a }}</option> }
          </select>
        </div>
        <div class="f">
          <label>Recurso</label>
          <input [(ngModel)]="f.recurso" placeholder="id / referencia" />
        </div>
        <div class="f">
          <label>Desde</label>
          <input type="date" [(ngModel)]="desde" />
        </div>
        <div class="f">
          <label>Hasta</label>
          <input type="date" [(ngModel)]="hasta" />
        </div>
        <div class="acc">
          <button class="btn-primary" (click)="cargar()"><mat-icon>search</mat-icon> Filtrar</button>
          <button class="btn-ghost" (click)="limpiar()">Limpiar</button>
        </div>
      </div>

      <!-- KPIs -->
      <div class="kpis">
        <div class="kpi"><span class="v">{{ registros().length | number }}</span><span class="l">Eventos</span></div>
        <div class="kpi"><span class="v">{{ usuariosUnicos() }}</span><span class="l">Usuarios distintos</span></div>
        <div class="kpi"><span class="v">{{ accionesUnicas() }}</span><span class="l">Tipos de acción</span></div>
        <div class="kpi"><span class="v">{{ ultimaFecha() }}</span><span class="l">Último evento</span></div>
      </div>

      <!-- Tabla -->
      <section class="panel">
        @if (cargando()) {
          <p class="estado">Cargando bitácora…</p>
        } @else if (error()) {
          <p class="estado err"><mat-icon>error</mat-icon> {{ error() }}</p>
        } @else if (!registros().length) {
          <div class="vacia">
            <mat-icon>history</mat-icon>
            <p>Sin eventos para los filtros aplicados.</p>
          </div>
        } @else {
          <table class="tbl">
            <thead>
              <tr><th>Fecha</th><th>Acción</th><th>Usuario</th><th>Recurso</th><th>Detalle</th></tr>
            </thead>
            <tbody>
              @for (b of registros(); track b.logId) {
                <tr>
                  <td class="fecha">{{ fmtFecha(b.fecha) }}</td>
                  <td><span class="tag" [class]="tono(b.accion)">{{ b.accion }}</span></td>
                  <td>{{ b.usuario || '—' }}</td>
                  <td class="mono">{{ b.recurso || '—' }}</td>
                  <td class="detalle" [title]="b.detalle">{{ b.detalle || '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    </app-report-shell>
  `,
  styles: [`
    .filtros { display: flex; flex-wrap: wrap; gap: 12px 14px; align-items: flex-end; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 16px; margin-bottom: 16px; }
    .f { display: flex; flex-direction: column; gap: 4px; min-width: 150px; }
    .f label { font-size: 11px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; color: var(--muted); }
    .f input, .f select { font: inherit; font-size: 13.5px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 9px; background: var(--surface-2); color: var(--ink); }
    .acc { display: flex; gap: 8px; margin-left: auto; }
    .btn-primary { display: inline-flex; align-items: center; gap: 5px; border: 0; background: var(--accent); color: #fff; font: inherit; font-weight: 700; font-size: 13.5px; padding: 9px 16px; border-radius: 9px; cursor: pointer; }
    .btn-primary mat-icon { font-size: 17px; height: 17px; width: 17px; }
    .btn-ghost { border: 1px solid var(--line-2); background: transparent; color: var(--ink-2); font: inherit; font-weight: 600; font-size: 13.5px; padding: 9px 14px; border-radius: 9px; cursor: pointer; }
    .btn-ghost:hover { background: var(--surface-2); }

    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; margin-bottom: 16px; }
    .kpi { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 16px 18px; }
    .kpi .v { display: block; font-family: 'Fraunces', Georgia, serif; font-size: 24px; font-weight: 700; color: var(--ink); }
    .kpi .l { display: block; color: var(--muted); font-size: 12px; margin-top: 3px; }

    .panel { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 8px 4px; }
    .tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
    .tbl th, .tbl td { border-bottom: 1px solid var(--line); padding: 9px 12px; text-align: left; vertical-align: top; }
    .tbl th { color: var(--muted); font-weight: 700; font-size: 11.5px; text-transform: uppercase; letter-spacing: .05em; }
    .tbl tr:hover td { background: var(--surface-2); }
    .fecha { white-space: nowrap; color: var(--ink-2); }
    .mono { font-family: ui-monospace, 'Cascadia Code', monospace; font-size: 12px; color: var(--ink-2); }
    .detalle { max-width: 360px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--muted); }
    .tag { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; background: var(--surface-2); color: var(--ink-2); white-space: nowrap; }
    .tag.ok { background: rgba(77,124,74,.14); color: var(--ok); }
    .tag.warn { background: var(--accent-soft); color: var(--accent); }
    .tag.bad { background: rgba(161,59,47,.13); color: var(--bad); }

    .estado { color: var(--muted); padding: 22px; }
    .estado.err { color: var(--bad); display: flex; align-items: center; gap: 8px; }
    .estado.err mat-icon { font-size: 19px; height: 19px; width: 19px; }
    .vacia { text-align: center; color: var(--muted); padding: 44px 16px; }
    .vacia mat-icon { font-size: 42px; height: 42px; width: 42px; opacity: .4; }
    .vacia p { margin: 8px 0 0; }
  `],
})
export class AuditoriaComponent {
  private api = inject(Ms2BitacoraService);

  // Acciones conocidas (las que emite MS2 hoy + auditoría genérica).
  acciones = ['SUBIDA_DOCUMENTO', 'DESCARGA_DOCUMENTO', 'ELIMINACION_LOGICA'];

  f: BitacoraFiltros = { usuario: '', accion: '', recurso: '', limite: 300 };
  desde = '';
  hasta = '';

  registros = signal<Bitacora[]>([]);
  cargando = signal(false);
  error = signal('');

  constructor() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.error.set('');
    // El backend compara fechas ISO lexicográficamente; añadimos hora límite al "hasta".
    const filtros: BitacoraFiltros = {
      ...this.f,
      desde: this.desde || undefined,
      hasta: this.hasta ? this.hasta + 'T23:59:59' : undefined,
    };
    this.api.listar(filtros).subscribe({
      next: (r) => {
        this.registros.set(r);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(
          e?.status === 403
            ? 'No autorizado: la bitácora es solo para ADMIN.'
            : 'No se pudo cargar la bitácora. ¿Gateway/MS2 arriba?',
        );
        console.error(e);
      },
    });
  }

  limpiar() {
    this.f = { usuario: '', accion: '', recurso: '', limite: 300 };
    this.desde = '';
    this.hasta = '';
    this.cargar();
  }

  // ---- KPIs derivados ----
  usuariosUnicos = computed(() => new Set(this.registros().map((b) => b.usuario)).size);
  accionesUnicas = computed(() => new Set(this.registros().map((b) => b.accion)).size);
  ultimaFecha = computed(() => {
    const r = this.registros();
    return r.length ? this.fmtFecha(r[0].fecha) : '—'; // backend ya ordena desc
  });

  fmtFecha(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' });
  }

  tono(accion: string): string {
    const a = (accion || '').toUpperCase();
    if (a.includes('ELIMINA')) return 'bad';
    if (a.includes('SUBIDA') || a.includes('CREA')) return 'ok';
    if (a.includes('DESCARGA') || a.includes('RETRASO')) return 'warn';
    return '';
  }

  build = (): ReporteExport => ({
    titulo: 'Bitácora de auditoría',
    subtitulo: 'Eventos registrados en DynamoDB (MS2 Documental)',
    secciones: [
      {
        titulo: 'Resumen', tipo: 'kpis', kpis: [
          { label: 'Eventos', valor: String(this.registros().length) },
          { label: 'Usuarios distintos', valor: String(this.usuariosUnicos()) },
          { label: 'Tipos de acción', valor: String(this.accionesUnicas()) },
        ],
      },
      {
        titulo: 'Eventos', tipo: 'tabla',
        columnas: ['Fecha', 'Acción', 'Usuario', 'Recurso', 'Detalle'],
        filas: this.registros().map((b) => [this.fmtFecha(b.fecha), b.accion, b.usuario, b.recurso, b.detalle]),
      },
    ],
  });
}
