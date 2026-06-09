import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Sucursal {
  id: number;
  nombre: string;
  departamento: string;
  ciudad: string;
  direccion?: string | null;
  gps_lat: number;
  gps_lng: number;
  activa: boolean;
  created_at: string;
}

export interface ZonaMetrica {
  id: number;
  nombre: string;
  codigo: string;
  sucursal_id?: number | null;
  gps_lat: number;
  gps_lng: number;
  num_envios: number;
  tiempo_entrega_prom: number;
  num_incidencias: number;
  grupo?: string | null;
}

export interface EnvioHistorico {
  id: number;
  tracking_ref?: string | null;
  sucursal_origen_id?: number | null;
  sucursal_destino_id?: number | null;
  peso: number;
  distancia: number;
  hora: number;
  dia_semana: number;
  tipo_servicio: string;
  zona: string;
  horas_estimadas?: number | null;
  horas_transito?: number | null;
  entregado_a_tiempo?: boolean | null;
  riesgo: string;
  fecha_registro?: string | null;
}

export interface IncidenteZona {
  id: number;
  tracking_ref?: string | null;
  tipo: string;
  descripcion?: string | null;
  gps_lat: number;
  gps_lng: number;
  dia_semana: number;
  hora?: number | null;
  zona_metrica_id?: number | null;
  asesor_id?: string | null;
  fecha: string;
}

export interface ZonaDiaMetrica {
  id: number;
  zona_metrica_id: number;
  dia_semana: number;
  gps_lat: number;
  gps_lng: number;
  num_envios: number;
  tiempo_entrega_prom: number;
  num_incidencias: number;
  grupo?: string | null;
}

export interface ResumenDataset {
  sucursales: number;
  zonas: number;
  envios_historicos: number;
  incidentes: number;
  zonas_por_grupo: Record<string, number>;
  envios_por_riesgo: Record<string, number>;
  envios_por_servicio: Record<string, number>;
  incidentes_por_tipo: Record<string, number>;
  incidentes_por_dia: Record<string, number>;
}

// Cliente REST para ver los datasets de ML del MS3 (sucursales, zonas, envíos históricos).
@Injectable({ providedIn: 'root' })
export class Ms3DatasetsService {
  private http = inject(HttpClient);
  private base = environment.ms3RestUrl;

  resumen(): Observable<ResumenDataset> {
    return this.http.get<ResumenDataset>(`${this.base}/ml/dataset/resumen`);
  }

  sucursales(): Observable<Sucursal[]> {
    return this.http.get<Sucursal[]>(`${this.base}/sucursales`);
  }

  zonas(): Observable<ZonaMetrica[]> {
    return this.http.get<ZonaMetrica[]>(`${this.base}/ml/dataset/zonas`);
  }

  envios(limit = 100, riesgo?: string): Observable<EnvioHistorico[]> {
    let url = `${this.base}/ml/dataset/envios?limit=${limit}`;
    if (riesgo) url += `&riesgo=${riesgo}`;
    return this.http.get<EnvioHistorico[]>(url);
  }

  reclasificarZonas(): Observable<ZonaMetrica[]> {
    return this.http.post<ZonaMetrica[]>(`${this.base}/ml/zonas/reclasificar`, {});
  }

  incidentes(diaSemana?: number, tipo?: string): Observable<IncidenteZona[]> {
    const p = new URLSearchParams();
    if (diaSemana != null) p.set('dia_semana', String(diaSemana));
    if (tipo) p.set('tipo', tipo);
    const q = p.toString();
    return this.http.get<IncidenteZona[]>(`${this.base}/incidentes${q ? '?' + q : ''}`);
  }

  zonaDia(diaSemana?: number): Observable<ZonaDiaMetrica[]> {
    const q = diaSemana != null ? `?dia_semana=${diaSemana}` : '';
    return this.http.get<ZonaDiaMetrica[]>(`${this.base}/ml/dataset/zona-dia${q}`);
  }
}
