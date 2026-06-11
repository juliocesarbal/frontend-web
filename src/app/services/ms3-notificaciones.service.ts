import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Notificacion {
  id: number;
  tipo: string;
  titulo: string;
  cuerpo: string | null;
  data_json: string | null;
  leida: boolean;
  created_at: string;
  read_at: string | null;
}

// Centro de notificaciones del MS3 (in-app). El JWT lo agrega el interceptor.
@Injectable({ providedIn: 'root' })
export class Ms3NotificacionesService {
  private http = inject(HttpClient);
  private base = environment.ms3RestUrl;

  listar(soloNoLeidas = false): Observable<Notificacion[]> {
    const params = soloNoLeidas ? { solo_no_leidas: true } : undefined;
    return this.http.get<Notificacion[]>(`${this.base}/notificaciones`, { params });
  }

  contador(): Observable<{ no_leidas: number }> {
    return this.http.get<{ no_leidas: number }>(`${this.base}/notificaciones/contador`);
  }

  leer(id: number): Observable<void> {
    return this.http.post<void>(`${this.base}/notificaciones/${id}/leer`, {});
  }

  leerTodas(): Observable<{ marcadas: number }> {
    return this.http.post<{ marcadas: number }>(`${this.base}/notificaciones/leer-todas`, {});
  }

  // El admin responde/avisa a un asesor.
  responderAsesor(asesorId: string, titulo: string, cuerpo: string): Observable<Notificacion> {
    return this.http.post<Notificacion>(`${this.base}/notificaciones/admin`, {
      asesor_id: asesorId,
      titulo,
      cuerpo,
    });
  }
}
