import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

interface Herramienta {
  titulo: string;
  desc: string;
  icon: string;
  path: string;
  clase: string;
  tag: string;
}

// Hub de Inteligencia: cada herramienta (IA / ML retraso / ML zonas) tiene su
// propia página. Aquí solo se elige. El submenú del sidebar también lleva a cada una.
@Component({
  selector: 'app-inteligencia',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatIconModule],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h2>Inteligencia</h2>
          <div class="sub">Funciones de IA y Machine Learning del MS3 — elegí una herramienta</div>
        </div>
      </div>

      <div class="cards">
        @for (h of tools; track h.path) {
          <mat-card class="tool" [routerLink]="h.path">
            <span class="ico" [class]="h.clase"><mat-icon>{{ h.icon }}</mat-icon></span>
            <span class="tag">{{ h.tag }}</span>
            <h3>{{ h.titulo }}</h3>
            <p>{{ h.desc }}</p>
            <span class="go">Abrir <mat-icon>arrow_forward</mat-icon></span>
          </mat-card>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; }
      .tool { padding: 24px; cursor: pointer; display: flex; flex-direction: column; align-items: flex-start;
        transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
      .tool:hover { transform: translateY(-3px); border-color: var(--accent); box-shadow: 0 12px 28px -14px rgba(28,25,23,.3); }
      .ico { width: 50px; height: 50px; border-radius: 13px; display: grid; place-items: center; margin-bottom: 14px; border: 1px solid var(--line-2); }
      .ico mat-icon { font-size: 26px; height: 26px; width: 26px; }
      .ico.ia { background: var(--surface-2); color: var(--ink); }
      .ico.ml { background: var(--accent-soft); color: var(--accent); }
      .ico.kmeans { background: var(--ink); color: #f4f1ea; border-color: var(--ink); }
      .ico.kmeans mat-icon { color: #f4f1ea; }
      .tag { font-size: 10.5px; font-weight: 700; letter-spacing: .1em; color: var(--muted); text-transform: uppercase; }
      .tool h3 { margin: 6px 0 6px; font-size: 18px; }
      .tool p { margin: 0 0 18px; color: var(--muted); font-size: 13.5px; line-height: 1.45; }
      .go { margin-top: auto; display: inline-flex; align-items: center; gap: 4px; color: var(--accent); font-weight: 600; font-size: 13.5px; }
      .go mat-icon { font-size: 18px; height: 18px; width: 18px; }
    `,
  ],
})
export class InteligenciaComponent {
  tools: Herramienta[] = [
    {
      titulo: 'Analizar foto de paquete',
      desc: 'Visión por computadora (MobileNetV2): clasifica daño o etiqueta ilegible.',
      icon: 'image_search',
      path: '/inteligencia/ia',
      clase: 'ia',
      tag: 'IA · Deep Learning',
    },
    {
      titulo: 'Predecir riesgo de retraso',
      desc: 'Modelo supervisado (RandomForest) que estima BAJO / MEDIO / ALTO.',
      icon: 'online_prediction',
      path: '/inteligencia/retraso',
      clase: 'ml',
      tag: 'ML · Supervisado',
    },
    {
      titulo: 'Agrupar zonas (K-Means)',
      desc: 'Modelo no supervisado que segmenta zonas por comportamiento.',
      icon: 'scatter_plot',
      path: '/inteligencia/zonas',
      clase: 'kmeans',
      tag: 'ML · No supervisado',
    },
  ];
}
