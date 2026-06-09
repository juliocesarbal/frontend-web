import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Metadatos de documento que devuelve el MS2 (espejo del modelo Documento de Spring).
export interface Documento {
  docId: string;
  envioId: string;
  tipo: string;
  nombreArchivo: string;
  s3Key: string;
  hashSha256: string;
  usuario: string;
  fecha: string;
  accion: string;
  eliminado: boolean;
}

// Tipos de documento soportados (coinciden con el MS2).
export const TIPOS_DOCUMENTO = ['GUIA', 'COMPROBANTE', 'INCIDENCIA', 'EVIDENCIA'] as const;

// Cliente REST para el MS2 (Documental). El JWT lo agrega el jwtInterceptor.
@Injectable({ providedIn: 'root' })
export class Ms2DocumentosService {
  private http = inject(HttpClient);
  private base = environment.ms2RestUrl;

  subir(file: File, envioId: string, tipo: string, nombre?: string): Observable<Documento> {
    const form = new FormData();
    form.append('file', file);
    form.append('envioId', envioId);
    form.append('tipo', tipo);
    if (nombre && nombre.trim()) form.append('nombre', nombre.trim());
    return this.http.post<Documento>(`${this.base}/documentos`, form);
  }

  // Sin envioId -> todos. Con envioId -> filtra por envio.
  listar(envioId?: string): Observable<Documento[]> {
    const params: Record<string, string> = envioId && envioId.trim() ? { envioId: envioId.trim() } : {};
    return this.http.get<Documento[]>(`${this.base}/documentos`, { params });
  }

  urlDescarga(id: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.base}/documentos/${id}/download`);
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/documentos/${id}`);
  }
}
