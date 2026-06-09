import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AnalizarFotoOut {
  clase: string;
  confianza: number;
  probabilidades: Record<string, number>;
  incidencia_creada: boolean;
  tracking?: string | null;
}

export interface PredecirRetrasoIn {
  peso: number;
  hora: number;
  dia_semana: number;
  tipo_servicio: string;
  zona: string;
  sucursal_origen_id?: number | null;
  sucursal_destino_id?: number | null;
  distancia?: number | null;
}

export interface PredecirRetrasoOut {
  riesgo: string;
  probabilidades: Record<string, number>;
  distancia?: number | null;
}

export interface ZonaIn {
  nombre?: string;
  gps_lat?: number;
  gps_lng?: number;
  num_envios: number;
  tiempo_entrega_prom: number;
  num_incidencias: number;
}

export interface ZonaGrupoOut {
  nombre?: string;
  cluster: number;
  grupo: string;
  num_envios: number;
  num_incidencias: number;
}

// Cliente REST para las funciones inteligentes del MS3 (IA + ML).
@Injectable({ providedIn: 'root' })
export class Ms3InteligenciaService {
  private http = inject(HttpClient);
  private base = environment.ms3RestUrl;

  analizarFoto(file: File, tracking?: string): Observable<AnalizarFotoOut> {
    const form = new FormData();
    form.append('file', file);
    if (tracking && tracking.trim()) form.append('tracking', tracking.trim());
    return this.http.post<AnalizarFotoOut>(`${this.base}/ia/analizar-foto`, form);
  }

  predecirRetraso(payload: PredecirRetrasoIn): Observable<PredecirRetrasoOut> {
    return this.http.post<PredecirRetrasoOut>(`${this.base}/ml/predecir-retraso`, payload);
  }

  agruparZonas(zonas: ZonaIn[]): Observable<ZonaGrupoOut[]> {
    return this.http.post<ZonaGrupoOut[]>(`${this.base}/ml/agrupar-zonas`, { zonas });
  }
}
