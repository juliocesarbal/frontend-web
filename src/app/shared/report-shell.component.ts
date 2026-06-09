import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ReportExportService, ReporteExport } from './report-export.service';

// Cabecera reutilizable de cada hoja de reporte: título, subtítulo y botones de export.
// El contenido (KPIs, gráficos, tablas) se proyecta con <ng-content>.
@Component({
  selector: 'app-report-shell',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="rep">
      <header class="head">
        <div class="ttl">
          <h2>{{ titulo }}</h2>
          @if (subtitulo) { <p class="sub">{{ subtitulo }}</p> }
        </div>
        <div class="acts">
          <button mat-stroked-button (click)="exp('pdf')"><mat-icon>picture_as_pdf</mat-icon> PDF</button>
          <button mat-stroked-button (click)="exp('excel')"><mat-icon>table_view</mat-icon> Excel</button>
          <button mat-stroked-button (click)="exp('html')"><mat-icon>html</mat-icon> HTML</button>
        </div>
      </header>
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .rep { padding: 4px 4px 40px; }
    .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
    .ttl h2 { font-family: 'Fraunces', Georgia, serif; font-size: 26px; font-weight: 600; color: var(--ink); margin: 0; }
    .ttl .sub { color: var(--muted); margin: 4px 0 0; font-size: 14px; }
    .acts { display: flex; gap: 8px; }
    .acts button { font-weight: 600; }
    .acts mat-icon { font-size: 18px; height: 18px; width: 18px; margin-right: 2px; }
  `],
})
export class ReportShellComponent {
  @Input() titulo = '';
  @Input() subtitulo = '';
  // El padre provee la función que construye el modelo de export al momento del click.
  @Input() build: () => ReporteExport = () => ({ titulo: this.titulo, secciones: [] });

  constructor(private exporter: ReportExportService) {}

  exp(fmt: 'pdf' | 'excel' | 'html') {
    const rep = this.build();
    if (fmt === 'pdf') this.exporter.pdf(rep);
    else if (fmt === 'excel') this.exporter.excel(rep);
    else this.exporter.html(rep);
  }
}
