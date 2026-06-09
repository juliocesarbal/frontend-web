import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Par {
  clave: string;
  valor: number;
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

  operacion(): Observable<ReporteOperacion> {
    return this.http.get<ReporteOperacion>(`${this.base}/reportes/operacion`);
  }

  rankings(): Observable<ReporteRankings> {
    return this.http.get<ReporteRankings>(`${this.base}/reportes/rankings`);
  }
}
