import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Encomienda {
  id: number;
  tracking_code: string;
  cliente_id?: string;
  cliente_nombre?: string;
  cliente_direccion?: string;
  origen?: string;
  destino?: string;
  peso?: number;
  servicio_ref?: string;
  zona_ref?: string;
  sucursal_origen_id?: number;
  sucursal_destino_id?: number;
  distancia?: number;
  estado: string;
  costo?: number;
  riesgo_retraso?: string;
  created_at: string;
}

export interface EstadoHistorial {
  estado: string;
  fecha: string;
  ubicacion?: string;
  gps_lat?: number;
  gps_lng?: number;
}

export interface TrackingInfo {
  tracking_code: string;
  estado: string;
  historial: EstadoHistorial[];
}

export interface EventoBlockchain {
  id: number;
  tracking?: string;
  tipo_evento: string;
  hash_sha256: string;
  tx_hash?: string | null;
  fecha: string;
}

// Cliente REST para el MS3 (Operativo/IA). El JWT lo agrega el jwtInterceptor.
@Injectable({ providedIn: 'root' })
export class Ms3EncomiendasService {
  private http = inject(HttpClient);
  private base = environment.ms3RestUrl;

  crear(payload: Partial<Encomienda>): Observable<Encomienda> {
    return this.http.post<Encomienda>(`${this.base}/encomiendas`, payload);
  }

  listar(): Observable<Encomienda[]> {
    return this.http.get<Encomienda[]>(`${this.base}/encomiendas`);
  }

  tracking(trk: string): Observable<TrackingInfo> {
    return this.http.get<TrackingInfo>(`${this.base}/encomiendas/${trk}/tracking`);
  }

  // Cambia el estado del envio (MS3 valida la transicion; RETRASADO dispara n8n).
  cambiarEstado(trk: string, estado: string, ubicacion?: string): Observable<Encomienda> {
    return this.http.post<Encomienda>(`${this.base}/encomiendas/${trk}/estado`, {
      estado,
      ubicacion,
    });
  }

  eventosBlockchain(trk: string): Observable<EventoBlockchain[]> {
    return this.http.get<EventoBlockchain[]>(`${this.base}/blockchain/eventos`, {
      params: { tracking: trk },
    });
  }
}
