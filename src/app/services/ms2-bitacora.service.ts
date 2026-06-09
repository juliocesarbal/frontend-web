import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Entrada de bitácora de auditoría (espejo del modelo Bitacora de MS2/DynamoDB).
export interface Bitacora {
  logId: string;
  accion: string;
  usuario: string;
  fecha: string;     // ISO-8601
  recurso: string;
  detalle: string;
}

export interface BitacoraFiltros {
  usuario?: string;
  accion?: string;
  recurso?: string;
  desde?: string;    // fecha ISO (o YYYY-MM-DD)
  hasta?: string;
  limite?: number;
}

// Cliente REST para la bitácora de auditoría del MS2 (DynamoDB). Solo ADMIN.
@Injectable({ providedIn: 'root' })
export class Ms2BitacoraService {
  private http = inject(HttpClient);
  private base = environment.ms2RestUrl;

  listar(f: BitacoraFiltros = {}): Observable<Bitacora[]> {
    let p = new HttpParams();
    const set = (k: string, v: unknown) => {
      if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
    };
    set('usuario', f.usuario);
    set('accion', f.accion);
    set('recurso', f.recurso);
    set('desde', f.desde);
    set('hasta', f.hasta);
    set('limite', f.limite);
    return this.http.get<Bitacora[]>(`${this.base}/bitacora`, { params: p });
  }
}
