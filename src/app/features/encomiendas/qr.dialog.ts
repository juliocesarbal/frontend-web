import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Ms3EncomiendasService, Encomienda } from '../../services/ms3-encomiendas.service';

// Muestra el QR de la guia (generado por MS3) con opciones de descargar e imprimir.
// El QR codifica el tracking_code: el asesor lo escanea en la app y ve el envio.
@Component({
  selector: 'app-qr-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>QR de la guía</h2>
    <mat-dialog-content class="content">
      <div class="trk">{{ data.tracking_code }}</div>
      @if (data.cliente_nombre || data.destino) {
        <div class="meta">{{ data.cliente_nombre }} @if (data.destino) { · {{ data.destino }} }</div>
      }

      @if (cargando()) {
        <div class="center"><mat-spinner diameter="40"></mat-spinner></div>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (url()) {
        <img [src]="url()" alt="QR {{ data.tracking_code }}" class="qr" />
        <p class="hint">Imprímelo y pégalo en el paquete. El asesor lo escaneará para ver los datos.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cerrar</button>
      <button mat-stroked-button [disabled]="!url()" (click)="imprimir()">
        <mat-icon>print</mat-icon> Imprimir
      </button>
      <button mat-raised-button color="primary" [disabled]="!url()" (click)="descargar()">
        <mat-icon>download</mat-icon> Descargar PNG
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .content { text-align: center; }
      .trk { font-weight: 700; font-size: 18px; }
      .meta { color: var(--muted); font-size: 13px; margin-bottom: 12px; }
      .qr { width: 240px; height: 240px; image-rendering: pixelated; border: 1px solid var(--line); border-radius: 8px; }
      .hint { color: var(--muted); font-size: 12px; max-width: 260px; margin: 10px auto 0; }
      .center { padding: 40px; }
      .error { color: var(--warn); }
    `,
  ],
})
export class QrDialog implements OnInit, OnDestroy {
  private ms3 = inject(Ms3EncomiendasService);
  data = inject<Encomienda>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<QrDialog>);

  cargando = signal(true);
  error = signal<string | null>(null);
  url = signal<string | null>(null);
  private objectUrl: string | null = null;

  ngOnInit() {
    this.ms3.qrPng(this.data.tracking_code).subscribe({
      next: (blob) => {
        this.objectUrl = URL.createObjectURL(blob);
        this.url.set(this.objectUrl);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo generar el QR.');
        this.cargando.set(false);
      },
    });
  }

  ngOnDestroy() {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }

  descargar() {
    const u = this.url();
    if (!u) return;
    const a = document.createElement('a');
    a.href = u;
    a.download = `QR-${this.data.tracking_code}.png`;
    a.click();
  }

  imprimir() {
    const u = this.url();
    if (!u) return;
    const w = window.open('', '_blank', 'width=400,height=520');
    if (!w) return;
    w.document.write(`
      <html><head><title>QR ${this.data.tracking_code}</title>
      <style>body{font-family:sans-serif;text-align:center;padding:24px}
      img{width:300px;height:300px;image-rendering:pixelated}
      .trk{font-weight:700;font-size:18px;margin-top:12px}</style></head>
      <body onload="window.print()">
        <img src="${u}" />
        <div class="trk">${this.data.tracking_code}</div>
      </body></html>`);
    w.document.close();
  }
}
