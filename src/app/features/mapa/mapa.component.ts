import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import * as L from 'leaflet';
import { Ms3DatasetsService, Sucursal } from '../../services/ms3-datasets.service';
import { Ms3RutaService, RutaAnalisis } from '../../services/ms3-ruta.service';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const SERVICIOS = ['DOCUMENTO', 'PAQUETE_NORMAL', 'CARGA_PESADA', 'EXPRESS'];

// Color por grupo de zona (K-Means).
const COLOR_GRUPO: Record<string, string> = {
  RETRASOS_FRECUENTES: '#a13b2f',
  ALTA_DEMANDA: '#b45309',
  BAJA_DEMANDA: '#4d7c4a',
};
const COLOR_RIESGO: Record<string, string> = { ALTO: '#a13b2f', MEDIO: '#b45309', BAJO: '#4d7c4a' };

// Mapa operativo: ruta recomendada (OSRM) + zonas de riesgo + incidentes + modelo.
@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  template: `
    <div class="page">
      <header class="head">
        <div>
          <h2>Mapa operativo</h2>
          <p class="sub">Ruta recomendada + zonas de riesgo + retraso estimado por el modelo</p>
        </div>
      </header>

      <div class="layout">
        <aside class="panel">
          <div class="field">
            <label>Sucursal origen</label>
            <select [(ngModel)]="origenId">
              <option [ngValue]="null" disabled>Elegir…</option>
              @for (s of sucursales(); track s.id) { <option [ngValue]="s.id">{{ s.nombre }}</option> }
            </select>
          </div>
          <div class="field">
            <label>Sucursal destino</label>
            <select [(ngModel)]="destinoId">
              <option [ngValue]="null" disabled>Elegir…</option>
              @for (s of sucursales(); track s.id) { <option [ngValue]="s.id">{{ s.nombre }}</option> }
            </select>
          </div>
          <div class="grid2">
            <div class="field">
              <label>Día</label>
              <select [(ngModel)]="dia">
                @for (d of dias; track d; let i = $index) { <option [ngValue]="i">{{ d }}</option> }
              </select>
            </div>
            <div class="field">
              <label>Hora</label>
              <input type="number" min="0" max="23" [(ngModel)]="hora" />
            </div>
          </div>
          <div class="grid2">
            <div class="field">
              <label>Servicio</label>
              <select [(ngModel)]="servicio">
                @for (sv of servicios; track sv) { <option [ngValue]="sv">{{ sv }}</option> }
              </select>
            </div>
            <div class="field">
              <label>Peso (kg)</label>
              <input type="number" min="0.1" step="0.5" [(ngModel)]="peso" />
            </div>
          </div>

          <button class="btn" (click)="analizar()" [disabled]="cargando() || !origenId || !destinoId">
            {{ cargando() ? 'Analizando…' : 'Analizar ruta' }}
          </button>
          @if (error()) { <p class="err">{{ error() }}</p> }

          @if (analisis(); as a) {
            <div class="result">
              <div class="badge" [style.background]="colorRiesgo(a.riesgo)">Riesgo {{ a.riesgo }}</div>
              @if (fuenteRuta() === 'HAVERSINE') {
                <p class="aviso">⚠ Ruta aproximada (línea recta): OSRM no respondió. La distancia y el ETA son estimados, no el camino real.</p>
              }
              <p class="resumen">{{ a.resumen }}</p>
              <div class="kpis">
                <div><b>{{ a.distancia_km | number: '1.0-0' }}</b><span>km carretera</span></div>
                <div><b>{{ a.duracion_estimada_h | number: '1.1-1' }}</b><span>h base (OSRM)</span></div>
                <div class="warn"><b>+{{ a.retraso_estimado_h | number: '1.1-1' }}</b><span>h retraso extra</span></div>
                <div><b>{{ a.eta_total_h | number: '1.1-1' }}</b><span>h ETA total</span></div>
              </div>

              @if (a.zonas_en_ruta.length) {
                <h4>Zonas en la ruta ({{ a.zonas_en_ruta.length }})</h4>
                <ul class="lista">
                  @for (z of a.zonas_en_ruta; track z.id) {
                    <li>
                      <span class="dot" [style.background]="colorGrupo(z.grupo)"></span>
                      <span class="nm">{{ z.nombre }}</span>
                      @if (z.incidentes_dia > 0) { <span class="tag">{{ z.incidentes_dia }} inc. {{ dias[a.dia_semana].slice(0,3) }}</span> }
                    </li>
                  }
                </ul>
              }
              @if (a.incidentes.length) {
                <h4>Incidentes reportados ({{ a.incidentes.length }})</h4>
                <ul class="lista">
                  @for (inc of a.incidentes; track $index) {
                    <li><span class="dot" style="background:#a13b2f"></span><span class="nm">{{ inc.tipo }} — {{ inc.descripcion }}</span></li>
                  }
                </ul>
              }

              <div class="leyenda">
                <span><i style="background:#a13b2f"></i> Retrasos frec.</span>
                <span><i style="background:#b45309"></i> Alta demanda</span>
                <span><i style="background:#4d7c4a"></i> Baja demanda</span>
              </div>
            </div>
          }
        </aside>

        <div class="map-wrap"><div #mapEl class="map-box"></div></div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 4px 4px 30px; }
    .head h2 { font-family: 'Fraunces', Georgia, serif; font-size: 26px; font-weight: 600; color: var(--ink); margin: 0; }
    .head .sub { color: var(--muted); margin: 4px 0 16px; font-size: 14px; }
    .layout { display: grid; grid-template-columns: 340px 1fr; gap: 16px; align-items: stretch; }
    .panel { background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 18px; min-width: 0; }
    .field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; min-width: 0; }
    .field label { font-size: 12px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
    .field select, .field input { font: inherit; font-size: 14px; padding: 9px 11px; border: 1px solid var(--line); border-radius: 9px; background: var(--surface-2); color: var(--ink); width: 100%; max-width: 100%; box-sizing: border-box; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; min-width: 0; }
    .btn { width: 100%; margin-top: 4px; padding: 11px; border: 0; border-radius: 10px; background: var(--accent); color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; }
    .btn:disabled { opacity: .55; cursor: default; }
    .err { color: #a13b2f; font-size: 13px; margin-top: 10px; }
    .result { margin-top: 18px; border-top: 1px solid var(--line); padding-top: 14px; }
    .aviso { background: #fbf0d9; border: 1px solid #e3c77a; color: #7a5b12; font-size: 12px; line-height: 1.4; padding: 8px 11px; border-radius: 9px; margin: 10px 0 0; }
    .badge { display: inline-block; color: #fff; font-weight: 700; font-size: 12px; padding: 4px 12px; border-radius: 20px; }
    .resumen { font-size: 13px; color: var(--ink-2); margin: 10px 0 14px; line-height: 1.4; }
    .kpis { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .kpis > div { background: var(--surface-2); border-radius: 10px; padding: 10px 12px; }
    .kpis b { display: block; font-family: 'Fraunces', Georgia, serif; font-size: 20px; color: var(--ink); }
    .kpis span { font-size: 11px; color: var(--muted); }
    .kpis .warn b { color: var(--accent); }
    h4 { font-size: 13px; color: var(--ink); margin: 16px 0 7px; }
    .lista { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; max-height: 190px; overflow: auto; }
    .lista li { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--ink-2); }
    .lista .dot { width: 9px; height: 9px; border-radius: 50%; flex: none; }
    .lista .nm { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .lista .tag { font-size: 10.5px; font-weight: 700; color: #a13b2f; background: #f6e7e3; padding: 1px 7px; border-radius: 10px; }
    .leyenda { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 14px; font-size: 11.5px; color: var(--muted); }
    .leyenda i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
    .map-wrap { border: 1px solid var(--line); border-radius: 14px; overflow: hidden; display: flex; min-height: 460px; }
    .map-box { flex: 1; height: 100%; min-height: 460px; width: 100%; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; align-items: start; } .map-box { height: 440px; } }
  `],
})
export class MapaComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapEl') mapEl!: ElementRef<HTMLDivElement>;
  private datasets = inject(Ms3DatasetsService);
  private rutaSvc = inject(Ms3RutaService);

  dias = DIAS;
  servicios = SERVICIOS;
  sucursales = signal<Sucursal[]>([]);
  origenId: number | null = null;
  destinoId: number | null = null;
  dia = 0;
  hora = 9;
  servicio = 'PAQUETE_NORMAL';
  peso = 5;

  cargando = signal(false);
  error = signal('');
  analisis = signal<RutaAnalisis | null>(null);
  fuenteRuta = signal<'OSRM' | 'HAVERSINE'>('OSRM'); // de dónde salió la geometría dibujada

  private map?: L.Map;
  private capa?: L.LayerGroup;

  constructor() {
    this.datasets.sucursales().subscribe((s) => {
      this.sucursales.set(s);
      if (s.length >= 2) {
        this.origenId = s[0].id;
        this.destinoId = s.find((x) => x.id !== s[0].id)?.id ?? s[1].id;
      }
    });
  }

  ngAfterViewInit() {
    this.map = L.map(this.mapEl.nativeElement, { zoomControl: true }).setView([-16.9, -64.8], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap',
    }).addTo(this.map);
    this.capa = L.layerGroup().addTo(this.map);
    setTimeout(() => this.map?.invalidateSize(), 200);
  }

  ngOnDestroy() {
    this.map?.remove();
  }

  colorGrupo(g: string | null) {
    return COLOR_GRUPO[g ?? ''] ?? '#837b70';
  }
  colorRiesgo(r: string) {
    return COLOR_RIESGO[r] ?? '#837b70';
  }

  async analizar() {
    if (!this.origenId || !this.destinoId || this.origenId === this.destinoId) {
      this.error.set('Elige sucursales de origen y destino distintas.');
      return;
    }
    this.error.set('');
    this.cargando.set(true);
    this.analisis.set(null);

    const o = this.sucursales().find((s) => s.id === this.origenId)!;
    const d = this.sucursales().find((s) => s.id === this.destinoId)!;

    // 1) Ruta recomendada de carretera. Cadena de fallback:
    //    a) OSRM directo desde el navegador (rápido)
    //    b) si falla, OSRM vía backend (server-to-server, estable)
    //    c) si también falla, línea recta (queda marcado como aproximado)
    let geometry: number[][] = [[o.gps_lat, o.gps_lng], [d.gps_lat, d.gps_lng]];
    let distKm: number | undefined;
    let durMin: number | undefined;
    let fuente: 'OSRM' | 'HAVERSINE' = 'HAVERSINE';

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${o.gps_lng},${o.gps_lat};${d.gps_lng},${d.gps_lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const j = await res.json();
      if (j.code === 'Ok' && j.routes?.length) {
        const r = j.routes[0];
        geometry = r.geometry.coordinates.map((c: number[]) => [c[1], c[0]]); // [lng,lat]->[lat,lng]
        distKm = r.distance / 1000;
        durMin = r.duration / 60;
        fuente = 'OSRM';
      }
    } catch {
      /* OSRM browser falló (throttle/CORS/red): probamos el backend abajo */
    }

    // b) Fallback: el backend pide la ruta a OSRM (no sufre el throttle del browser).
    if (fuente !== 'OSRM') {
      try {
        const bk = await firstValueFrom(this.rutaSvc.rutaOsrm(this.origenId, this.destinoId));
        if (bk.geometry?.length >= 2) {
          geometry = bk.geometry;
          distKm = bk.distancia_km;
          durMin = bk.duracion_min ?? undefined;
          fuente = bk.fuente; // 'OSRM' si el backend la consiguió, si no 'HAVERSINE'
        }
      } catch {
        /* backend tampoco: queda la línea recta marcada como aproximada */
      }
    }
    this.fuenteRuta.set(fuente);

    // 2) Análisis en el backend (zonas, incidentes, modelo, retraso).
    this.rutaSvc
      .analizar({
        sucursal_origen_id: this.origenId,
        sucursal_destino_id: this.destinoId,
        dia_semana: this.dia,
        hora: this.hora,
        peso: this.peso,
        tipo_servicio: this.servicio,
        geometry,
        distancia_km: distKm,
        duracion_min: durMin,
      })
      .subscribe({
        next: (a) => {
          this.analisis.set(a);
          this.cargando.set(false);
          this.dibujar(a, geometry);
        },
        error: (e) => {
          this.error.set('No se pudo analizar la ruta. ¿Gateway/MS3 arriba?');
          this.cargando.set(false);
          console.error(e);
        },
      });
  }

  private dibujar(a: RutaAnalisis, geometry: number[][]) {
    if (!this.map || !this.capa) return;
    this.capa.clearLayers();
    const latlngs = geometry.map((p) => L.latLng(p[0], p[1]));

    // Ruta. Si la geometría es real (OSRM) -> línea sólida; si es la recta de
    // respaldo (HAVERSINE) -> punteada y atenuada para que se note que es aprox.
    const aprox = this.fuenteRuta() === 'HAVERSINE';
    L.polyline(latlngs, {
      color: this.colorRiesgo(a.riesgo),
      weight: aprox ? 3 : 5,
      opacity: aprox ? 0.6 : 0.85,
      dashArray: aprox ? '8, 10' : undefined,
    }).addTo(this.capa);

    // Origen / destino (divIcon con estilo inline -> sin assets ni encapsulación)
    const pin = (txt: string, bg: string) =>
      L.divIcon({
        className: '',
        html: `<div style="background:${bg};color:#fff;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:grid;place-items:center;box-shadow:0 1px 4px rgba(0,0,0,.4);border:2px solid #fff"><span style="transform:rotate(45deg);font:700 11px sans-serif">${txt}</span></div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 26],
      });
    L.marker([a.origen.gps_lat, a.origen.gps_lng], { icon: pin('O', '#1c1917') })
      .bindPopup(`<b>Origen</b><br>${a.origen.nombre}`)
      .addTo(this.capa);
    L.marker([a.destino.gps_lat, a.destino.gps_lng], { icon: pin('D', '#a8682f') })
      .bindPopup(`<b>Destino</b><br>${a.destino.nombre}`)
      .addTo(this.capa);

    // Zonas en ruta (radio por incidencias, color por grupo)
    for (const z of a.zonas_en_ruta) {
      const critico = z.incidentes_dia > 0;
      L.circleMarker([z.gps_lat, z.gps_lng], {
        radius: 7 + Math.min(z.num_incidencias / 6, 12),
        color: critico ? '#a13b2f' : this.colorGrupo(z.grupo),
        weight: critico ? 3 : 1.5,
        fillColor: this.colorGrupo(z.grupo),
        fillOpacity: 0.45,
      })
        .bindPopup(
          `<b>${z.nombre}</b><br>Grupo: ${z.grupo ?? '—'}<br>Incidencias: ${z.num_incidencias}<br>Incidentes ese día: ${z.incidentes_dia}`,
        )
        .addTo(this.capa);
    }

    // Incidentes reportados
    for (const inc of a.incidentes) {
      L.circleMarker([inc.gps_lat, inc.gps_lng], {
        radius: 5,
        color: '#7a1f17',
        weight: 1,
        fillColor: '#a13b2f',
        fillOpacity: 0.9,
      })
        .bindPopup(`<b>⚠ ${inc.tipo}</b><br>${inc.descripcion ?? ''}`)
        .addTo(this.capa);
    }

    // El panel pudo crecer al renderizar el análisis -> recalcular tamaño del mapa.
    setTimeout(() => {
      this.map?.invalidateSize();
      this.map?.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
    }, 120);
  }
}
