import { ChangeDetectorRef, Component, NgZone, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ChatBiResponse, Ms3BiChatService } from '../../services/ms3-bi-chat.service';

interface Mensaje {
  rol: 'usuario' | 'bot';
  texto: string;
  resp?: ChatBiResponse;
}

// Chatbot BI (CU-16) como widget flotante: botón (FAB) abajo-derecha que abre un
// panel de chat. El admin pide informes en lenguaje natural y los descarga
// (PDF/Excel/CSV). El backend (MS3 + Claude) interpreta, consulta y genera el archivo.
@Component({
  selector: 'app-bi-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <!-- Botón flotante -->
    <button class="fab" [class.oculto]="abierto()" (click)="abierto.set(true)" aria-label="Asistente de reportes">
      <mat-icon>forum</mat-icon>
    </button>

    @if (abierto()) {
      <div class="panel">
        <header class="head">
          <div class="ttl">
            <span class="ico"><mat-icon>forum</mat-icon></span>
            <div>
              <h3>Asistente de reportes</h3>
              <p>Pide un informe y lo exporto (PDF, Excel, CSV)</p>
            </div>
          </div>
          <button class="cerrar" (click)="abierto.set(false)" aria-label="Cerrar"><mat-icon>close</mat-icon></button>
        </header>

        <div class="hist">
          @if (mensajes().length === 0) {
            <div class="vacio">
              <p>Ejemplos:</p>
              <button class="chip" (click)="usar(ej1)">{{ ej1 }}</button>
              <button class="chip" (click)="usar(ej2)">{{ ej2 }}</button>
              <button class="chip" (click)="usar(ej3)">{{ ej3 }}</button>
            </div>
          }
          @for (m of mensajes(); track $index) {
            <div class="msg" [class.user]="m.rol === 'usuario'">
              <div class="burbuja">
                <span>{{ m.texto }}</span>
                @if (m.resp) {
                  @if (m.resp.aviso) { <p class="aviso">⚠ {{ m.resp.aviso }}</p> }
                  <button class="descargar" [disabled]="bajando() === m.resp.reporte_id" (click)="descargar(m.resp)">
                    <mat-icon>download</mat-icon>
                    {{ bajando() === m.resp.reporte_id ? 'Descargando…' : 'Descargar ' + m.resp.formato }}
                  </button>
                  <small class="meta">{{ m.resp.nombre_archivo }}</small>
                }
              </div>
            </div>
          }
          @if (cargando()) { <div class="msg"><div class="burbuja escribiendo">Generando informe…</div></div> }
        </div>

        @if (error()) { <p class="err">{{ error() }}</p> }

        @if (escuchando()) { <p class="oyendo"><span class="dot"></span> Escuchando… habla tu pedido</p> }

        <form class="entrada" (ngSubmit)="enviar()">
          @if (vozDisponible) {
            <button type="button" class="mic" [class.activo]="escuchando()" [disabled]="cargando()"
                    (click)="toggleVoz()" [attr.aria-label]="escuchando() ? 'Detener dictado' : 'Dictar por voz'">
              <mat-icon>{{ escuchando() ? 'stop' : 'mic' }}</mat-icon>
            </button>
          }
          <input [(ngModel)]="texto" name="texto" [disabled]="cargando()"
                 placeholder="Ej: ingresos de Santa Cruz entre febrero y marzo en PDF"
                 autocomplete="off" />
          <button type="submit" [disabled]="cargando() || !texto.trim()" aria-label="Enviar">
            <mat-icon>send</mat-icon>
          </button>
        </form>
      </div>
    }
  `,
  styles: [`
    .fab {
      position: fixed; right: 24px; bottom: 24px; z-index: 1000;
      width: 58px; height: 58px; border-radius: 50%; border: none;
      background: var(--accent); color: #fff; cursor: pointer;
      display: grid; place-items: center;
      box-shadow: 0 8px 24px rgba(0,0,0,.22); transition: transform .15s, box-shadow .15s, opacity .15s;
    }
    .fab mat-icon { font-size: 26px; width: 26px; height: 26px; }
    .fab:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,.28); }
    .fab.oculto { opacity: 0; pointer-events: none; transform: scale(.6); }

    .panel {
      position: fixed; right: 24px; bottom: 24px; z-index: 1001;
      width: 400px; max-width: calc(100vw - 32px); height: 560px; max-height: calc(100vh - 100px);
      background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
      box-shadow: 0 18px 50px rgba(0,0,0,.28); display: flex; flex-direction: column; overflow: hidden;
      animation: pop .16s ease;
    }
    @keyframes pop { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: none; } }

    .head { display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 14px 16px; background: var(--ink); color: #f4f1ea; }
    .ttl { display: flex; align-items: center; gap: 11px; }
    .ttl .ico { width: 36px; height: 36px; border-radius: 10px; background: var(--accent); display: grid; place-items: center; flex: none; }
    .ttl .ico mat-icon { font-size: 20px; width: 20px; height: 20px; color: #fff; }
    .head h3 { font-family: 'Fraunces', Georgia, serif; font-size: 15.5px; margin: 0; }
    .head p { font-size: 11.5px; margin: 1px 0 0; color: rgba(244,241,234,.66); }
    .cerrar { background: transparent; border: none; color: rgba(244,241,234,.8); cursor: pointer; display: grid; place-items: center; padding: 4px; border-radius: 8px; }
    .cerrar:hover { background: rgba(244,241,234,.12); }

    .hist { flex: 1; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; padding: 14px; }
    .vacio { color: var(--muted); font-size: 13px; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
    .vacio p { margin: 0; }
    .chip { background: var(--surface-2, #faf6ee); border: 1px solid var(--line); border-radius: 12px; padding: 8px 12px; font-size: 12px; color: var(--ink); cursor: pointer; text-align: left; transition: border-color .2s; }
    .chip:hover { border-color: var(--accent); }
    .msg { display: flex; }
    .msg.user { justify-content: flex-end; }
    .burbuja { max-width: 84%; background: var(--surface-2, #faf6ee); border: 1px solid var(--line); border-radius: 12px; padding: 10px 13px; font-size: 13.5px; color: var(--ink); display: flex; flex-direction: column; gap: 7px; line-height: 1.4; }
    .msg.user .burbuja { background: var(--accent); color: #fff; border-color: var(--accent); }
    .escribiendo { font-style: italic; color: var(--muted); }
    .descargar { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; background: var(--accent); color: #fff; border: none; border-radius: 9px; padding: 8px 14px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
    .descargar mat-icon { font-size: 17px; width: 17px; height: 17px; }
    .descargar:disabled { opacity: .6; cursor: default; }
    .meta { color: var(--muted); font-size: 10.5px; }
    .aviso { color: var(--warn, #b45309); font-size: 12px; margin: 0; }
    .err { color: var(--bad, #a13b2f); font-size: 12.5px; margin: 0 14px; }

    .oyendo { display: flex; align-items: center; gap: 8px; margin: 0 14px 2px; font-size: 12px; color: var(--accent); font-weight: 600; }
    .oyendo .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--bad, #a13b2f); animation: pulso 1s infinite; }
    @keyframes pulso { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .4; transform: scale(.7); } }

    .entrada { display: flex; gap: 8px; padding: 12px 14px; border-top: 1px solid var(--line); }
    .mic { background: var(--surface-2, #faf6ee); color: var(--ink); border: 1px solid var(--line); border-radius: 10px; width: 42px; display: grid; place-items: center; cursor: pointer; flex: none; transition: background .15s; }
    .mic:hover { border-color: var(--accent); }
    .mic mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .mic.activo { background: var(--bad, #a13b2f); color: #fff; border-color: var(--bad, #a13b2f); animation: micpulso 1.2s infinite; }
    @keyframes micpulso { 0%,100% { box-shadow: 0 0 0 0 rgba(161,59,47,.4); } 50% { box-shadow: 0 0 0 6px rgba(161,59,47,0); } }
    .mic:disabled { opacity: .5; cursor: default; }
    .entrada input { flex: 1; border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; font-size: 13px; background: #fff; color: var(--ink); }
    .entrada input:focus { outline: none; border-color: var(--accent); }
    .entrada button { background: var(--accent); color: #fff; border: none; border-radius: 10px; width: 42px; display: grid; place-items: center; cursor: pointer; flex: none; }
    .entrada button mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .entrada button:disabled { opacity: .5; cursor: default; }

    @media (max-width: 480px) {
      .panel { right: 12px; bottom: 12px; left: 12px; width: auto; height: calc(100vh - 80px); }
      .fab { right: 16px; bottom: 16px; }
    }
  `],
})
export class BiChatComponent {
  private svc = inject(Ms3BiChatService);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  abierto = signal(false);
  mensajes = signal<Mensaje[]>([]);
  texto = '';
  cargando = signal(false);
  bajando = signal<string | null>(null);
  error = signal<string | null>(null);

  ej1 = 'Informe de ingresos de Santa Cruz entre febrero y marzo en PDF';
  ej2 = 'Reporte de operación por zona en Excel';
  ej3 = 'Top clientes y servicios en CSV';

  // --- Dictado por voz (Web Speech API, nativa del navegador, sin librerías) ---
  escuchando = signal(false);
  private recog: any = null;
  private baseTexto = ''; // texto previo al dictado (para concatenar)
  private autoEnviar = false; // true cuando el usuario habló y debe enviarse al terminar
  vozDisponible =
    typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  usar(t: string) {
    this.texto = t;
    this.enviar();
  }

  toggleVoz() {
    if (this.escuchando()) {
      this.detenerVoz();
      return;
    }
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = 'es-BO';
    r.continuous = true; // sigue escuchando hasta que el usuario para o hay silencio largo
    r.interimResults = true; // resultados en vivo mientras habla
    this.baseTexto = this.texto.trim() ? this.texto.trim() + ' ' : '';
    this.autoEnviar = false;

    // Web Speech corre fuera de NgZone: envolver en zone.run para que Angular
    // detecte los cambios y escriba en vivo en el input.
    r.onresult = (ev: any) => this.zone.run(() => {
      let finalTxt = '';
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        if (res.isFinal) finalTxt += res[0].transcript;
        else interim += res[0].transcript;
      }
      if (finalTxt) {
        this.baseTexto = (this.baseTexto + finalTxt).replace(/\s+/g, ' ');
        this.autoEnviar = true;
      }
      this.texto = (this.baseTexto + interim).trim();
      this.cdr.detectChanges();
    });
    r.onerror = (ev: any) => this.zone.run(() => {
      this.escuchando.set(false);
      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        this.error.set('Permiso de micrófono denegado. Habilítalo en el navegador.');
      }
    });
    r.onend = () => this.zone.run(() => {
      this.escuchando.set(false);
      this.recog = null;
      if (this.autoEnviar && this.texto.trim()) this.enviar();
    });

    this.recog = r;
    this.error.set(null);
    this.escuchando.set(true);
    try {
      r.start();
    } catch {
      this.escuchando.set(false);
    }
  }

  detenerVoz() {
    if (this.recog) {
      try {
        this.recog.stop();
      } catch {
        /* ignore */
      }
    }
  }

  enviar() {
    const prompt = this.texto.trim();
    if (!prompt || this.cargando()) return;
    this.error.set(null);
    this.mensajes.update((m) => [...m, { rol: 'usuario', texto: prompt }]);
    this.texto = '';
    this.cargando.set(true);
    this.svc.chat(prompt).subscribe({
      next: (r) => {
        this.mensajes.update((m) => [...m, { rol: 'bot', texto: r.mensaje, resp: r }]);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        const msg = e?.error?.detail || e?.message || 'No se pudo generar el informe.';
        this.mensajes.update((m) => [...m, { rol: 'bot', texto: msg }]);
      },
    });
  }

  descargar(r: ChatBiResponse) {
    this.bajando.set(r.reporte_id);
    this.svc.descargar(r.reporte_id, r.nombre_archivo).subscribe({
      next: (blob) => {
        this.svc.guardarBlob(blob, r.nombre_archivo);
        this.bajando.set(null);
      },
      error: () => {
        this.bajando.set(null);
        this.error.set('No se pudo descargar (el reporte pudo expirar). Vuelve a pedirlo.');
      },
    });
  }
}
