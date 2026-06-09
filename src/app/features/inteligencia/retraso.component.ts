import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import * as L from 'leaflet';
import { Ms3RutaService, RutaAnalisis } from '../../services/ms3-ruta.service';
import { Ms3DatasetsService, Sucursal } from '../../services/ms3-datasets.service';

const SERVICIOS = ['DOCUMENTO', 'PAQUETE_NORMAL', 'CARGA_PESADA', 'EXPRESS'];
const DIAS = [
  { v: 0, n: 'Lunes' }, { v: 1, n: 'Martes' }, { v: 2, n: 'Miércoles' }, { v: 3, n: 'Jueves' },
  { v: 4, n: 'Viernes' }, { v: 5, n: 'Sábado' }, { v: 6, n: 'Domingo' },
];
const COLOR_GRUPO: Record<string, string> = {
  RETRASOS_FRECUENTES: '#a13b2f', ALTA_DEMANDA: '#b45309', BAJA_DEMANDA: '#4d7c4a',
};

function haversine(a: Sucursal, b: Sucursal): number {
  const r = 6371, t = Math.PI / 180;
  const dLat = (b.gps_lat - a.gps_lat) * t, dLng = (b.gps_lng - a.gps_lng) * t;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.gps_lat * t) * Math.cos(b.gps_lat * t) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.asin(Math.sqrt(x));
}

// CU-12 — ML supervisado: predicción de riesgo de retraso (RandomForest). Envío
// sucursal->sucursal (sin zona de entrega). Muestra mini-mapa de la ruta + ETA + retraso.
@Component({
  selector: 'app-retraso',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <a routerLink="/inteligencia" class="back"><mat-icon>arrow_back</mat-icon> Inteligencia</a>
      <div class="page-head">
        <div class="head-ttl">
          <span class="ico"><mat-icon>online_prediction</mat-icon></span>
          <div>
            <h2>ML · Predecir riesgo de retraso</h2>
            <div class="sub">Modelo supervisado (RandomForest) → BAJO / MEDIO / ALTO · envío sucursal → sucursal</div>
          </div>
        </div>
      </div>

      <div class="dos">
        <!-- Formulario -->
        <mat-card class="col">
          <h3>Ruta del envío</h3>
          <div class="grid">
            <mat-form-field appearance="outline" class="col2"><mat-label>Sucursal de origen</mat-label>
              <mat-select [(ngModel)]="form.sucursal_origen_id">
                @for (s of sucursales(); track s.id) { <mat-option [value]="s.id">{{ s.nombre }} · {{ s.departamento }}</mat-option> }
              </mat-select>
              <mat-icon matPrefix>trip_origin</mat-icon>
            </mat-form-field>
            <mat-form-field appearance="outline" class="col2"><mat-label>Sucursal de destino</mat-label>
              <mat-select [(ngModel)]="form.sucursal_destino_id">
                @for (s of sucursales(); track s.id) { <mat-option [value]="s.id">{{ s.nombre }} · {{ s.departamento }}</mat-option> }
              </mat-select>
              <mat-icon matPrefix>place</mat-icon>
            </mat-form-field>
          </div>
          @if (distanciaCalc() !== null) {
            <div class="dist-chip"><mat-icon>straighten</mat-icon> Distancia aprox.: <b>{{ distanciaCalc() | number: '1.0-0' }} km</b> (recta)</div>
          }

          <h3 class="mt">Datos del paquete</h3>
          <div class="grid">
            <mat-form-field appearance="outline"><mat-label>Peso (kg)</mat-label>
              <input matInput type="number" [(ngModel)]="form.peso" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Tipo de servicio</mat-label>
              <mat-select [(ngModel)]="form.tipo_servicio">
                @for (s of servicios; track s) { <mat-option [value]="s">{{ s }}</mat-option> }
              </mat-select></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Hora de registro</mat-label>
              <input matInput type="number" min="0" max="23" [(ngModel)]="form.hora" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Día</mat-label>
              <mat-select [(ngModel)]="form.dia_semana">
                @for (d of dias; track d.v) { <mat-option [value]="d.v">{{ d.n }}</mat-option> }
              </mat-select></mat-form-field>
          </div>
          <button mat-raised-button color="primary" class="full" [disabled]="cargando() || !puede()" (click)="predecir()">
            <mat-icon>online_prediction</mat-icon> Predecir riesgo
          </button>
          @if (!puede()) { <p class="hint"><mat-icon class="mini">info</mat-icon> Elegí sucursal de origen y destino.</p> }
          @if (cargando()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
        </mat-card>

        <!-- Resultado: mini-mapa arriba + predicción abajo -->
        <mat-card class="col">
          <h3>Ruta y predicción</h3>
          <div #mapEl class="mini-map"></div>

          @if (res(); as r) {
            <div class="ruta-kpis">
              <div><mat-icon>straighten</mat-icon><b>{{ r.distancia_km | number: '1.0-0' }} km</b><span>distancia</span></div>
              <div><mat-icon>schedule</mat-icon><b>{{ r.duracion_estimada_h | number: '1.1-1' }} h</b><span>tiempo estimado</span></div>
              <div class="warn"><mat-icon>hourglass_bottom</mat-icon><b>+{{ r.retraso_estimado_h | number: '1.1-1' }} h</b><span>retraso estimado</span></div>
              <div><mat-icon>flag</mat-icon><b>{{ r.eta_total_h | number: '1.1-1' }} h</b><span>ETA total</span></div>
            </div>

            <div class="riesgo-box" [class]="'box-' + r.riesgo">
              <span class="rk">Riesgo de retraso</span>
              <span class="rv">{{ r.riesgo }}</span>
            </div>
            <div class="bars">
              @for (p of probs(r.probabilidades); track p.k) {
                <div class="bar">
                  <span class="bar-k"><span class="dot" [class]="'g-' + p.k"></span>{{ p.k }}</span>
                  <div class="track"><div class="fill" [class]="'g-' + p.k" [style.width.%]="p.v * 100"></div></div>
                  <span class="bar-v">{{ (p.v * 100) | number: '1.0-1' }}%</span>
                </div>
              }
            </div>
            @if (r.riesgo === 'ALTO') {
              <div class="alerta"><mat-icon>priority_high</mat-icon> Priorizar seguimiento de este envío.</div>
            }
          } @else {
            <div class="vacio">
              <mat-icon>query_stats</mat-icon>
              <p>Elegí origen, destino y datos del paquete, luego <b>Predecir</b>.</p>
            </div>
          }
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .back { display: inline-flex; align-items: center; gap: 4px; color: var(--muted); text-decoration: none; font-size: 13px; margin-bottom: 10px; }
      .back:hover { color: var(--accent); }
      .back mat-icon { font-size: 18px; height: 18px; width: 18px; }
      .head-ttl { display: flex; align-items: center; gap: 14px; }
      .head-ttl .ico { width: 46px; height: 46px; border-radius: 12px; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; }
      .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
      .col { padding: 20px; }
      .col h3 { margin: 0 0 14px; font-size: 16px; }
      .col h3.mt { margin-top: 18px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 14px; }
      .col2 { grid-column: 1 / -1; }
      .full { width: 100%; }
      .dist-chip { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; background: var(--surface-2); border: 1px solid var(--line); border-radius: 10px; font-size: 14px; color: var(--ink-2); }
      .dist-chip mat-icon { color: var(--accent); font-size: 20px; height: 20px; width: 20px; }
      .hint { display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 12.5px; margin: 8px 0 0; }
      .mini { font-size: 16px; height: 16px; width: 16px; }
      .mini-map { height: 240px; width: 100%; border-radius: 12px; overflow: hidden; border: 1px solid var(--line); background: var(--surface-2); }
      .ruta-kpis { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 14px 0; }
      .ruta-kpis > div { display: flex; flex-direction: column; gap: 1px; background: var(--surface-2); border-radius: 10px; padding: 10px 12px; }
      .ruta-kpis mat-icon { font-size: 18px; height: 18px; width: 18px; color: var(--muted); }
      .ruta-kpis b { font-family: 'Fraunces', Georgia, serif; font-size: 19px; color: var(--ink); }
      .ruta-kpis span { font-size: 11px; color: var(--muted); }
      .ruta-kpis .warn b { color: var(--accent); }
      .riesgo-box { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 18px; border-radius: 14px; margin-bottom: 14px; border: 1px solid var(--line); }
      .riesgo-box .rk { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
      /* Valor SIEMPRE en tinta oscura (legible); el color del riesgo va en el borde/fondo suave. */
      .riesgo-box .rv { font-family: 'Fraunces', Georgia, serif; font-size: 38px; font-weight: 700; color: var(--ink); }
      .riesgo-box.box-ALTO { background: rgba(161,59,47,.12); border-color: rgba(161,59,47,.5); }
      .riesgo-box.box-MEDIO { background: rgba(180,83,9,.12); border-color: rgba(180,83,9,.5); }
      .riesgo-box.box-BAJO { background: rgba(77,124,74,.14); border-color: rgba(77,124,74,.5); }
      .bars { display: flex; flex-direction: column; gap: 10px; }
      .bar { display: grid; grid-template-columns: 120px 1fr 52px; align-items: center; gap: 10px; font-size: 13px; }
      .bar-k { display: flex; align-items: center; gap: 7px; color: var(--ink-2); }
      .bar-v { text-align: right; color: var(--muted); }
      .dot { width: 9px; height: 9px; border-radius: 50%; }
      .track { height: 9px; background: var(--surface-2); border-radius: 6px; overflow: hidden; }
      .fill { height: 100%; border-radius: 6px; background: var(--ink); }
      /* Colores por grupo SOLO en dot/fill (no se filtran a la caja de riesgo). */
      .dot.g-ALTO, .fill.g-ALTO { background: #a13b2f; }
      .dot.g-MEDIO, .fill.g-MEDIO { background: #b45309; }
      .dot.g-BAJO, .fill.g-BAJO { background: #4d7c4a; }
      .alerta { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: rgba(161,59,47,.1); color: var(--bad); border-radius: 10px; font-size: 13px; margin-top: 4px; }
      .vacio { padding: 30px 12px; text-align: center; color: var(--muted); }
      .vacio mat-icon { font-size: 42px; height: 42px; width: 42px; opacity: .4; }
      @media (max-width: 820px) { .dos { grid-template-columns: 1fr; } }
    `,
  ],
})
export class RetrasoComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapEl') mapEl!: ElementRef<HTMLDivElement>;
  private rutaSvc = inject(Ms3RutaService);
  private ds = inject(Ms3DatasetsService);
  private snack = inject(MatSnackBar);

  servicios = SERVICIOS;
  dias = DIAS;
  sucursales = signal<Sucursal[]>([]);
  form = {
    peso: 5, hora: 18, dia_semana: 5, tipo_servicio: 'PAQUETE_NORMAL',
    sucursal_origen_id: null as number | null, sucursal_destino_id: null as number | null,
  };
  res = signal<RutaAnalisis | null>(null);
  cargando = signal(false);

  private map?: L.Map;
  private capa?: L.LayerGroup;

  distanciaCalc = computed(() => {
    const o = this.sucursales().find((s) => s.id === this.form.sucursal_origen_id);
    const d = this.sucursales().find((s) => s.id === this.form.sucursal_destino_id);
    return o && d ? haversine(o, d) : null;
  });

  constructor() {
    this.ds.sucursales().subscribe({
      next: (s) => this.sucursales.set(s),
      error: () => this.snack.open('No se pudieron cargar sucursales (¿MS3 arriba?)', 'Cerrar', { duration: 3500 }),
    });
  }

  ngAfterViewInit() {
    this.map = L.map(this.mapEl.nativeElement, { zoomControl: true }).setView([-16.9, -64.8], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(this.map);
    this.capa = L.layerGroup().addTo(this.map);
    setTimeout(() => this.map?.invalidateSize(), 200);
  }

  ngOnDestroy() {
    this.map?.remove();
  }

  puede(): boolean {
    return this.form.sucursal_origen_id != null && this.form.sucursal_destino_id != null
      && this.form.sucursal_origen_id !== this.form.sucursal_destino_id;
  }

  probs(p: Record<string, number>) {
    return ['BAJO', 'MEDIO', 'ALTO'].filter((k) => k in p).map((k) => ({ k, v: p[k] }));
  }

  async predecir() {
    if (!this.puede()) return;
    this.cargando.set(true);

    const o = this.sucursales().find((s) => s.id === this.form.sucursal_origen_id)!;
    const d = this.sucursales().find((s) => s.id === this.form.sucursal_destino_id)!;

    // Ruta recomendada de OSRM (browser). Si falla, línea recta.
    let geometry: number[][] = [[o.gps_lat, o.gps_lng], [d.gps_lat, d.gps_lng]];
    let distKm: number | undefined;
    let durMin: number | undefined;
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${o.gps_lng},${o.gps_lat};${d.gps_lng},${d.gps_lat}?overview=full&geometries=geojson`;
      const j = await (await fetch(url)).json();
      if (j.code === 'Ok' && j.routes?.length) {
        const r = j.routes[0];
        geometry = r.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
        distKm = r.distance / 1000;
        durMin = r.duration / 60;
      }
    } catch { /* sin OSRM: línea recta + distancia del backend */ }

    this.rutaSvc
      .analizar({
        sucursal_origen_id: this.form.sucursal_origen_id!,
        sucursal_destino_id: this.form.sucursal_destino_id!,
        dia_semana: this.form.dia_semana,
        hora: this.form.hora,
        peso: this.form.peso,
        tipo_servicio: this.form.tipo_servicio,
        geometry, distancia_km: distKm, duracion_min: durMin,
      })
      .subscribe({
        next: (r) => { this.res.set(r); this.cargando.set(false); this.dibujar(r, geometry); },
        error: (e) => { this.snack.open(this.err(e), 'Cerrar', { duration: 4000 }); this.cargando.set(false); },
      });
  }

  private dibujar(r: RutaAnalisis, geometry: number[][]) {
    if (!this.map || !this.capa) return;
    this.capa.clearLayers();
    const latlngs = geometry.map((p) => L.latLng(p[0], p[1]));
    const col = COLOR_GRUPO[r.riesgo === 'ALTO' ? 'RETRASOS_FRECUENTES' : r.riesgo === 'MEDIO' ? 'ALTA_DEMANDA' : 'BAJA_DEMANDA'];

    L.polyline(latlngs, { color: col, weight: 5, opacity: 0.85 }).addTo(this.capa);

    const pin = (txt: string, bg: string) =>
      L.divIcon({
        className: '',
        html: `<div style="background:${bg};color:#fff;width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:grid;place-items:center;box-shadow:0 1px 4px rgba(0,0,0,.4);border:2px solid #fff"><span style="transform:rotate(45deg);font:700 10px sans-serif">${txt}</span></div>`,
        iconSize: [24, 24], iconAnchor: [12, 24],
      });
    L.marker([r.origen.gps_lat, r.origen.gps_lng], { icon: pin('O', '#1c1917') }).bindPopup(`<b>Origen</b><br>${r.origen.nombre}`).addTo(this.capa);
    L.marker([r.destino.gps_lat, r.destino.gps_lng], { icon: pin('D', '#a8682f') }).bindPopup(`<b>Destino</b><br>${r.destino.nombre}`).addTo(this.capa);

    for (const z of r.zonas_en_ruta) {
      const critico = z.incidentes_dia > 0;
      L.circleMarker([z.gps_lat, z.gps_lng], {
        radius: 6 + Math.min(z.num_incidencias / 6, 10),
        color: critico ? '#a13b2f' : COLOR_GRUPO[z.grupo ?? ''] ?? '#837b70',
        weight: critico ? 3 : 1.5,
        fillColor: COLOR_GRUPO[z.grupo ?? ''] ?? '#837b70',
        fillOpacity: 0.4,
      }).bindPopup(`<b>${z.nombre}</b><br>Grupo: ${z.grupo ?? '—'}<br>Incidentes ese día: ${z.incidentes_dia}`).addTo(this.capa);
    }

    this.map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });
    setTimeout(() => this.map?.invalidateSize(), 100);
  }

  private err(e: any): string {
    if (e?.status === 401) return 'No autorizado: inicia sesión de nuevo';
    if (e?.status === 403) return 'Sin permiso (requiere ADMIN)';
    if (e?.status === 503) return 'Modelo no entrenado en el MS3';
    if (e?.status === 0) return 'No se pudo contactar al MS3 (¿está corriendo?)';
    return e?.error?.detail ?? e?.message ?? 'Error';
  }
}
