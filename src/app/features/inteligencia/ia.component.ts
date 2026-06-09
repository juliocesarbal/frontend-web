import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AnalizarFotoOut, Ms3InteligenciaService } from '../../services/ms3-inteligencia.service';

// CU-11 — IA: clasificación de foto de paquete (MobileNetV2). Página propia.
@Component({
  selector: 'app-ia',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <a routerLink="/inteligencia" class="back"><mat-icon>arrow_back</mat-icon> Inteligencia</a>
      <div class="page-head">
        <div class="head-ttl">
          <span class="ico"><mat-icon>image_search</mat-icon></span>
          <div>
            <h2>IA · Analizar foto de paquete</h2>
            <div class="sub">Clasifica daño con visión por computadora — MobileNetV2 (transfer learning)</div>
          </div>
        </div>
      </div>

      <div class="dos">
        <!-- Columna: entrada -->
        <mat-card class="col">
          <h3>Imagen del paquete</h3>
          <div class="drop" (click)="fileInput.click()" [class.has]="fotoUrl()">
            @if (fotoUrl(); as url) {
              <img [src]="url" alt="preview" />
            } @else {
              <div class="drop-empty">
                <mat-icon>add_photo_alternate</mat-icon>
                <span>Clic para elegir una foto</span>
                <small>JPG o PNG</small>
              </div>
            }
          </div>
          <input #fileInput type="file" hidden accept="image/*" (change)="onFoto($event)" />
          @if (foto()) { <div class="fname"><mat-icon class="mini">attachment</mat-icon> {{ foto()?.name }}</div> }

          <mat-form-field appearance="outline" class="full">
            <mat-label>Tracking (opcional)</mat-label>
            <input matInput [(ngModel)]="iaTracking" placeholder="genera incidencia si hay daño" />
            <mat-icon matSuffix>qr_code</mat-icon>
          </mat-form-field>

          <button mat-raised-button color="primary" class="full" [disabled]="!foto() || cargando()" (click)="analizar()">
            <mat-icon>visibility</mat-icon> Analizar foto
          </button>
          @if (cargando()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
        </mat-card>

        <!-- Columna: resultado -->
        <mat-card class="col">
          <h3>Resultado</h3>
          @if (res(); as r) {
            <div class="res-top">
              <span class="clase" [class.bad]="r.clase === 'POSIBLE_DAÑO'" [class.ok]="r.clase === 'SIN_DAÑO'" [class.warn]="r.clase === 'ETIQUETA_ILEGIBLE'">
                {{ r.clase }}
              </span>
              <span class="conf">Confianza {{ (r.confianza * 100) | number: '1.0-1' }}%</span>
            </div>
            @if (r.incidencia_creada) {
              <div class="alerta"><mat-icon>report</mat-icon> Incidencia creada automáticamente para {{ r.tracking }}</div>
            }
            <div class="bars">
              @for (p of probs(r.probabilidades); track p.k) {
                <div class="bar">
                  <span class="bar-k">{{ p.k }}</span>
                  <div class="track"><div class="fill" [style.width.%]="p.v * 100"></div></div>
                  <span class="bar-v">{{ (p.v * 100) | number: '1.0-1' }}%</span>
                </div>
              }
            </div>
          } @else {
            <div class="vacio">
              <mat-icon>insights</mat-icon>
              <p>Subí una foto y presioná <b>Analizar</b> para ver la clasificación.</p>
            </div>
          }
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .back { display: inline-flex; align-items: center; gap: 4px; color: var(--muted); text-decoration: none; font-size: 13px; margin-bottom: 10px; }
      .back:hover { color: var(--accent); }
      .back mat-icon { font-size: 18px; height: 18px; width: 18px; }
      .head-ttl { display: flex; align-items: center; gap: 14px; }
      .head-ttl .ico { width: 46px; height: 46px; border-radius: 12px; background: var(--surface-2); border: 1px solid var(--line-2); color: var(--ink); display: grid; place-items: center; }
      .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
      .col { padding: 20px; }
      .col h3 { margin: 0 0 14px; font-size: 16px; }
      .full { width: 100%; }
      .drop { border: 1.5px dashed var(--line-2); border-radius: 14px; min-height: 220px; display: grid; place-items: center; cursor: pointer; overflow: hidden; background: var(--surface-2); transition: border-color .15s; }
      .drop:hover { border-color: var(--accent); }
      .drop.has { border-style: solid; padding: 0; }
      .drop img { width: 100%; height: 260px; object-fit: cover; display: block; }
      .drop-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; color: var(--muted); }
      .drop-empty mat-icon { font-size: 40px; height: 40px; width: 40px; opacity: .5; }
      .drop-empty small { font-size: 11px; }
      .fname { display: flex; align-items: center; gap: 6px; color: var(--ink-2); font-size: 13px; margin: 10px 0; }
      .mini { font-size: 16px; height: 16px; width: 16px; }
      .res-top { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 14px; }
      .clase { display: inline-flex; padding: 8px 16px; border-radius: 999px; font-weight: 700; font-size: 15px; background: var(--surface-2); color: var(--ink); }
      .clase.bad { background: rgba(161,59,47,.14); color: var(--bad); }
      .clase.ok { background: rgba(77,124,74,.16); color: var(--ok); }
      .clase.warn { background: rgba(180,83,9,.14); color: var(--warn); }
      .conf { color: var(--muted); font-size: 14px; }
      .alerta { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: rgba(161,59,47,.1); color: var(--bad); border-radius: 10px; font-size: 13px; margin-bottom: 14px; }
      .bars { display: flex; flex-direction: column; gap: 10px; }
      .bar { display: grid; grid-template-columns: 150px 1fr 52px; align-items: center; gap: 10px; font-size: 13px; }
      .bar-k { color: var(--ink-2); }
      .bar-v { text-align: right; color: var(--muted); }
      .track { height: 9px; background: var(--surface-2); border-radius: 6px; overflow: hidden; }
      .fill { height: 100%; background: var(--ink); border-radius: 6px; }
      .vacio { padding: 40px 12px; text-align: center; color: var(--muted); }
      .vacio mat-icon { font-size: 42px; height: 42px; width: 42px; opacity: .4; }
      @media (max-width: 820px) { .dos { grid-template-columns: 1fr; } }
    `,
  ],
})
export class IaComponent {
  private ms3 = inject(Ms3InteligenciaService);
  private snack = inject(MatSnackBar);

  foto = signal<File | null>(null);
  fotoUrl = signal<string | null>(null);
  iaTracking = '';
  res = signal<AnalizarFotoOut | null>(null);
  cargando = signal(false);

  probs(p: Record<string, number>) {
    return Object.entries(p).map(([k, v]) => ({ k, v }));
  }

  onFoto(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0] ?? null;
    this.foto.set(f);
    this.res.set(null);
    this.fotoUrl.set(f ? URL.createObjectURL(f) : null);
  }

  analizar() {
    const f = this.foto();
    if (!f) return;
    this.cargando.set(true);
    this.ms3.analizarFoto(f, this.iaTracking).subscribe({
      next: (r) => { this.res.set(r); this.cargando.set(false); },
      error: (e) => { this.snack.open(this.err(e), 'Cerrar', { duration: 4000 }); this.cargando.set(false); },
    });
  }

  private err(e: any): string {
    if (e?.status === 401) return 'No autorizado: inicia sesión de nuevo';
    if (e?.status === 403) return 'Sin permiso (requiere ADMIN)';
    if (e?.status === 503) return 'Modelo IA no entrenado en el MS3';
    if (e?.status === 0) return 'No se pudo contactar al MS3 (¿está corriendo?)';
    return e?.error?.detail ?? e?.message ?? 'Error';
  }
}
