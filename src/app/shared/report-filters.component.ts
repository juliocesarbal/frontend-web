import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Ms3DatasetsService, Sucursal } from '../services/ms3-datasets.service';

// Filtros (dimensiones) que comparten las hojas de reporte. Campos opcionales:
// los que queden en null/'' no se envían al backend.
export interface FiltrosReporte {
  desde?: string;            // mes YYYY-MM
  hasta?: string;            // mes YYYY-MM
  dia_semana?: number | null;
  hora_desde?: number | null;
  hora_hasta?: number | null;
  tipo_servicio?: string;
  riesgo?: string;
  sucursal_origen_id?: number | null;
  sucursal_destino_id?: number | null;
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const SERVICIOS = ['DOCUMENTO', 'PAQUETE_NORMAL', 'CARGA_PESADA', 'EXPRESS'];
const RIESGOS = ['BAJO', 'MEDIO', 'ALTO'];

// Barra de filtros reutilizable. `dims` decide qué dimensiones se muestran:
//   'tiempo' (mes desde/hasta) · 'dia' · 'hora' · 'servicio' · 'riesgo' · 'sucursal'.
// Emite (cambio) con el objeto de filtros al Aplicar / Limpiar.
@Component({
  selector: 'app-report-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="bar">
      <button class="toggle" (click)="abierto.set(!abierto())">
        <mat-icon>tune</mat-icon>
        <span>Dimensiones y filtros</span>
        @if (activos() > 0) { <span class="count">{{ activos() }}</span> }
        <mat-icon class="chev" [class.open]="abierto()">expand_more</mat-icon>
      </button>

      @if (abierto()) {
        <div class="campos">
          @if (has('tiempo')) {
            <div class="f">
              <label>Desde (mes)</label>
              <input type="month" [(ngModel)]="f.desde" />
            </div>
            <div class="f">
              <label>Hasta (mes)</label>
              <input type="month" [(ngModel)]="f.hasta" />
            </div>
          }
          @if (has('dia')) {
            <div class="f">
              <label>Día</label>
              <select [(ngModel)]="f.dia_semana">
                <option [ngValue]="null">Todos</option>
                @for (d of dias; track d; let i = $index) { <option [ngValue]="i">{{ d }}</option> }
              </select>
            </div>
          }
          @if (has('hora')) {
            <div class="f sm">
              <label>Hora desde</label>
              <input type="number" min="0" max="23" placeholder="0" [(ngModel)]="f.hora_desde" />
            </div>
            <div class="f sm">
              <label>Hora hasta</label>
              <input type="number" min="0" max="23" placeholder="23" [(ngModel)]="f.hora_hasta" />
            </div>
          }
          @if (has('servicio')) {
            <div class="f">
              <label>Servicio</label>
              <select [(ngModel)]="f.tipo_servicio">
                <option value="">Todos</option>
                @for (s of servicios; track s) { <option [value]="s">{{ s }}</option> }
              </select>
            </div>
          }
          @if (has('riesgo')) {
            <div class="f">
              <label>Riesgo</label>
              <select [(ngModel)]="f.riesgo">
                <option value="">Todos</option>
                @for (r of riesgos; track r) { <option [value]="r">{{ r }}</option> }
              </select>
            </div>
          }
          @if (has('sucursal')) {
            <div class="f">
              <label>Sucursal origen</label>
              <select [(ngModel)]="f.sucursal_origen_id">
                <option [ngValue]="null">Todas</option>
                @for (s of sucursales(); track s.id) { <option [ngValue]="s.id">{{ s.nombre }}</option> }
              </select>
            </div>
            <div class="f">
              <label>Sucursal destino</label>
              <select [(ngModel)]="f.sucursal_destino_id">
                <option [ngValue]="null">Todas</option>
                @for (s of sucursales(); track s.id) { <option [ngValue]="s.id">{{ s.nombre }}</option> }
              </select>
            </div>
          }

          <div class="acciones">
            <button class="btn-primary" (click)="aplicar()"><mat-icon>search</mat-icon> Aplicar</button>
            <button class="btn-ghost" (click)="limpiar()">Limpiar</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .bar { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; margin-bottom: 16px; overflow: hidden; }
    .toggle { width: 100%; display: flex; align-items: center; gap: 9px; padding: 13px 16px; border: 0; background: transparent; cursor: pointer; font: inherit; font-weight: 600; font-size: 14px; color: var(--ink); }
    .toggle .count { background: var(--accent); color: #fff; font-size: 11px; font-weight: 700; min-width: 19px; height: 19px; border-radius: 999px; display: grid; place-items: center; padding: 0 5px; }
    .toggle .chev { margin-left: auto; transition: transform .2s ease; color: var(--muted); }
    .toggle .chev.open { transform: rotate(180deg); }
    .toggle mat-icon { font-size: 19px; height: 19px; width: 19px; color: var(--accent); }
    .campos { display: flex; flex-wrap: wrap; gap: 12px 14px; padding: 4px 16px 16px; border-top: 1px solid var(--line); align-items: flex-end; }
    .f { display: flex; flex-direction: column; gap: 4px; min-width: 150px; }
    .f.sm { min-width: 96px; }
    .f label { font-size: 11px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; color: var(--muted); }
    .f input, .f select { font: inherit; font-size: 13.5px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 9px; background: var(--surface-2); color: var(--ink); }
    .acciones { display: flex; gap: 8px; margin-left: auto; }
    .btn-primary { display: inline-flex; align-items: center; gap: 5px; border: 0; background: var(--accent); color: #fff; font: inherit; font-weight: 700; font-size: 13.5px; padding: 9px 16px; border-radius: 9px; cursor: pointer; }
    .btn-primary mat-icon { font-size: 17px; height: 17px; width: 17px; }
    .btn-ghost { border: 1px solid var(--line-2); background: transparent; color: var(--ink-2); font: inherit; font-weight: 600; font-size: 13.5px; padding: 9px 14px; border-radius: 9px; cursor: pointer; }
    .btn-ghost:hover { background: var(--surface-2); }
  `],
})
export class ReportFiltersComponent implements OnInit {
  private datasets = inject(Ms3DatasetsService);

  // Dimensiones a mostrar (default: todas las del MS3).
  @Input() dims: Array<'tiempo' | 'dia' | 'hora' | 'servicio' | 'riesgo' | 'sucursal'> = [
    'tiempo', 'dia', 'hora', 'servicio', 'riesgo', 'sucursal',
  ];
  @Output() cambio = new EventEmitter<FiltrosReporte>();

  dias = DIAS;
  servicios = SERVICIOS;
  riesgos = RIESGOS;
  abierto = signal(false);
  sucursales = signal<Sucursal[]>([]);

  f: FiltrosReporte = {
    desde: '', hasta: '', dia_semana: null, hora_desde: null, hora_hasta: null,
    tipo_servicio: '', riesgo: '', sucursal_origen_id: null, sucursal_destino_id: null,
  };

  ngOnInit() {
    if (this.has('sucursal')) {
      this.datasets.sucursales().subscribe({
        next: (s) => this.sucursales.set(s),
        error: () => {},
      });
    }
  }

  has(d: string): boolean {
    return this.dims.includes(d as any);
  }

  // Nº de filtros activos (para el badge).
  activos(): number {
    const f = this.f;
    let n = 0;
    if (f.desde) n++;
    if (f.hasta) n++;
    if (f.dia_semana != null) n++;
    if (f.hora_desde != null) n++;
    if (f.hora_hasta != null) n++;
    if (f.tipo_servicio) n++;
    if (f.riesgo) n++;
    if (f.sucursal_origen_id != null) n++;
    if (f.sucursal_destino_id != null) n++;
    return n;
  }

  aplicar() {
    this.cambio.emit({ ...this.f });
  }

  limpiar() {
    this.f = {
      desde: '', hasta: '', dia_semana: null, hora_desde: null, hora_hasta: null,
      tipo_servicio: '', riesgo: '', sucursal_origen_id: null, sucursal_destino_id: null,
    };
    this.cambio.emit({ ...this.f });
  }
}
