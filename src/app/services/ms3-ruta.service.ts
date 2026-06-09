import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SucursalRef {
  id: number;
  nombre: string;
  ciudad: string;
  gps_lat: number;
  gps_lng: number;
}

export interface ZonaEnRuta {
  id: number;
  nombre: string;
  codigo: string;
  grupo: string | null;
  gps_lat: number;
  gps_lng: number;
  num_incidencias: number;
  incidentes_dia: number;
  dist_a_ruta_km: number;
}

export interface IncidenteEnRuta {
  tipo: string;
  descripcion: string | null;
  gps_lat: number;
  gps_lng: number;
  hora: number | null;
}

export interface RutaAnalisis {
  origen: SucursalRef;
  destino: SucursalRef;
  dia_semana: number;
  distancia_km: number;
  duracion_estimada_h: number;
  riesgo: string;
  probabilidad: number | null;
  probabilidades: Record<string, number>;
  retraso_estimado_h: number;
  eta_total_h: number;
  zonas_en_ruta: ZonaEnRuta[];
  incidentes: IncidenteEnRuta[];
  resumen: string;
}

export interface RutaAnalizarIn {
  sucursal_origen_id: number;
  sucursal_destino_id: number;
  dia_semana: number;
  hora: number;
  peso: number;
  tipo_servicio: string;
  geometry: number[][]; // [[lat, lng], ...] de OSRM (browser)
  distancia_km?: number;
  duracion_min?: number;
  umbral_km?: number;
}

// Cliente del análisis de ruta del MS3 (cruza ruta OSRM con zonas/incidentes/modelo).
@Injectable({ providedIn: 'root' })
export class Ms3RutaService {
  private http = inject(HttpClient);
  private base = environment.ms3RestUrl;

  analizar(body: RutaAnalizarIn): Observable<RutaAnalisis> {
    return this.http.post<RutaAnalisis>(`${this.base}/ruta/analizar`, body);
  }
}
