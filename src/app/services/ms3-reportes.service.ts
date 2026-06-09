import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FiltrosReporte } from '../shared/report-filters.component';

export interface Par {
  clave: string;
  valor: number;
}

export interface RankingClienteDetalle {
  cliente: string;
  total_envios: number;
  entregados_a_tiempo_pct: number;
  distancia_prom_km: number;
  por_servicio: Par[];
  por_zona: Par[];
  por_rutas: Par[];
  por_riesgo: Par[];
}

// Convierte los filtros en HttpParams (omite vacíos/null).
function aParams(f?: FiltrosReporte): HttpParams {
  let p = new HttpParams();
  if (!f) return p;
  const set = (k: string, v: unknown) => {
    if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
  };
  set('desde', f.desde);
  set('hasta', f.hasta);
  set('dia_semana', f.dia_semana);
  set('hora_desde', f.hora_desde);
  set('hora_hasta', f.hora_hasta);
  set('tipo_servicio', f.tipo_servicio);
  set('riesgo', f.riesgo);
  set('sucursal_origen_id', f.sucursal_origen_id);
  set('sucursal_destino_id', f.sucursal_destino_id);
  return p;
}

export interface ReporteOperacion {
  total_envios: number;
  distancia_prom_km: number;
  tiempo_prom_h: number;
  entregados_a_tiempo_pct: number;
  por_zona: Record<string, number>;
  por_servicio: Record<string, number>;
  por_riesgo: Record<string, number>;
  por_mes: Record<string, number>;
}

export interface ReporteRankings {
  top_clientes: Par[];
  top_servicios: Par[];
  top_zonas: Par[];
  top_rutas: Par[];
  top_sucursales: Par[];
}

// Cliente REST para los reportes BI operativos del MS3.
@Injectable({ providedIn: 'root' })
export class Ms3ReportesService {
  private http = inject(HttpClient);
  private base = environment.ms3RestUrl;

  operacion(filtros?: FiltrosReporte): Observable<ReporteOperacion> {
    return this.http.get<ReporteOperacion>(`${this.base}/reportes/operacion`, { params: aParams(filtros) });
  }

  rankings(filtros?: FiltrosReporte): Observable<ReporteRankings> {
    return this.http.get<ReporteRankings>(`${this.base}/reportes/rankings`, { params: aParams(filtros) });
  }

  // Drill-down de un cliente (panel interactivo del ranking).
  rankingCliente(nombre: string, filtros?: FiltrosReporte): Observable<RankingClienteDetalle> {
    return this.http.get<RankingClienteDetalle>(
      `${this.base}/reportes/rankings/cliente/${encodeURIComponent(nombre)}`,
      { params: aParams(filtros) },
    );
  }
}
