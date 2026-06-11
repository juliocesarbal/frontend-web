import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatBiResponse {
  mensaje: string;
  reporte_id: string;
  tipo: string;
  formato: string;
  nombre_archivo: string;
  descarga_url: string;
  parametros: Record<string, unknown>;
  aviso?: string | null;
}

// Cliente del chatbot BI (CU-16): manda el prompt en lenguaje natural a MS3,
// que lo interpreta con Claude, consulta los datos y genera el archivo.
@Injectable({ providedIn: 'root' })
export class Ms3BiChatService {
  private http = inject(HttpClient);
  private base = environment.ms3RestUrl;

  chat(prompt: string): Observable<ChatBiResponse> {
    return this.http.post<ChatBiResponse>(`${this.base}/bi/chat`, { prompt });
  }

  // Descarga el archivo generado (PDF/Excel/CSV) y dispara el "Guardar como".
  descargar(reporteId: string, nombre: string): Observable<Blob> {
    return this.http.get(`${this.base}/bi/descargar/${reporteId}`, { responseType: 'blob' });
  }

  guardarBlob(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
}
