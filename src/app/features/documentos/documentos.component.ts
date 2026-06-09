import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  Documento,
  Ms2DocumentosService,
  TIPOS_DOCUMENTO,
} from '../../services/ms2-documentos.service';

// Gestion documental (CU-06): subir, listar (todos o por envio), descargar y eliminar.
// Consume el MS2 (Spring Boot + S3 + DynamoDB) por REST.
@Component({
  selector: 'app-documentos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <h2>Documentos</h2>

      <mat-card class="form-card">
        <h3>Subir documento</h3>
        <div class="subir">
          <div class="campos">
            <div class="row">
              <mat-form-field appearance="outline">
                <mat-label>ID de envío (tracking)</mat-label>
                <input matInput [(ngModel)]="uploadEnvioId" placeholder="TRK-12345" />
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Tipo</mat-label>
                <mat-select [(ngModel)]="uploadTipo">
                  @for (t of tipos; track t) {
                    <mat-option [value]="t">{{ t }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            <div class="row">
              <mat-form-field appearance="outline" class="ancho">
                <mat-label>Nombre del archivo (opcional)</mat-label>
                <input matInput [(ngModel)]="uploadNombre" placeholder="Se conserva la extensión" />
              </mat-form-field>
            </div>

            <div class="row">
              <button mat-stroked-button type="button" (click)="fileInput.click()">
                <mat-icon>attach_file</mat-icon>
                {{ archivo()?.name ?? 'Elegir archivo' }}
              </button>
              <input
                #fileInput
                type="file"
                hidden
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                (change)="onFile($event)"
              />
              <button
                mat-raised-button
                color="primary"
                [disabled]="!puedeSubir() || subiendo()"
                (click)="subir()"
              >
                <mat-icon>cloud_upload</mat-icon> Subir
              </button>
            </div>
          </div>

          <!-- Vista previa del archivo seleccionado -->
          <div class="preview">
            @if (archivo()) {
              @if (previewUrl()) {
                <img [src]="previewUrl()" alt="vista previa" class="thumb" />
              } @else if (logoDe(archivo()!.name)) {
                <img [src]="logoDe(archivo()!.name)" alt="tipo" class="thumb" />
              } @else {
                <mat-icon class="thumb-icon">description</mat-icon>
              }
              <span class="preview-nombre">{{ nombreFinal() }}</span>
            } @else {
              <div class="preview-vacio">
                <mat-icon>image</mat-icon>
                <span>Vista previa</span>
              </div>
            }
          </div>
        </div>
        @if (subiendo()) {
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        }
      </mat-card>

      <mat-card class="form-card">
        <h3>Filtrar por envío</h3>
        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>ID de envío (tracking)</mat-label>
            <input matInput [(ngModel)]="busquedaEnvioId" (keyup.enter)="buscar()" />
          </mat-form-field>
          <button mat-raised-button color="primary" (click)="buscar()">
            <mat-icon>search</mat-icon> Buscar
          </button>
          <button mat-stroked-button (click)="verTodos()">
            <mat-icon>list</mat-icon> Ver todos
          </button>
        </div>
      </mat-card>

      <mat-card>
        @if (cargando()) {
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        }
        <table mat-table [dataSource]="documentos()">
          <ng-container matColumnDef="icono">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let d">
              @if (logoDe(d.nombreArchivo)) {
                <img [src]="logoDe(d.nombreArchivo)" alt="tipo" class="row-icon" />
              } @else if (esImagen(d.nombreArchivo)) {
                <mat-icon class="row-icon-mat" color="primary">image</mat-icon>
              } @else {
                <mat-icon class="row-icon-mat">description</mat-icon>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="nombre">
            <th mat-header-cell *matHeaderCellDef>Archivo</th>
            <td mat-cell *matCellDef="let d">{{ d.nombreArchivo }}</td>
          </ng-container>
          <ng-container matColumnDef="envio">
            <th mat-header-cell *matHeaderCellDef>Envío</th>
            <td mat-cell *matCellDef="let d">{{ d.envioId }}</td>
          </ng-container>
          <ng-container matColumnDef="tipo">
            <th mat-header-cell *matHeaderCellDef>Tipo</th>
            <td mat-cell *matCellDef="let d">{{ d.tipo }}</td>
          </ng-container>
          <ng-container matColumnDef="fecha">
            <th mat-header-cell *matHeaderCellDef>Fecha</th>
            <td mat-cell *matCellDef="let d">{{ d.fecha | date: 'short' }}</td>
          </ng-container>
          <ng-container matColumnDef="hash">
            <th mat-header-cell *matHeaderCellDef>Hash SHA-256</th>
            <td mat-cell *matCellDef="let d" [title]="d.hashSha256">
              {{ d.hashSha256 | slice: 0 : 12 }}…
            </td>
          </ng-container>
          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let d">
              <button mat-icon-button color="primary" title="Descargar" (click)="descargar(d)">
                <mat-icon>download</mat-icon>
              </button>
              <button mat-icon-button color="warn" title="Eliminar" (click)="eliminar(d)">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
        @if (!cargando() && documentos().length === 0) {
          <p class="vacio">No hay documentos.</p>
        }
      </mat-card>
    </div>
  `,
  styles: [
    `
      .page {
        padding: 16px;
      }
      .form-card {
        margin-bottom: 16px;
        padding: 16px;
      }
      .subir {
        display: flex;
        gap: 24px;
        align-items: flex-start;
        flex-wrap: wrap;
      }
      .campos {
        flex: 1;
        min-width: 320px;
      }
      .row {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
      }
      .ancho {
        width: 100%;
        max-width: 520px;
      }
      .preview {
        width: 160px;
        min-height: 160px;
        border: 1px dashed #c4c4c4;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px;
        text-align: center;
      }
      .thumb {
        max-width: 120px;
        max-height: 120px;
        object-fit: contain;
        border-radius: 4px;
      }
      .thumb-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #5f6368;
      }
      .preview-nombre {
        font-size: 12px;
        color: #555;
        word-break: break-all;
      }
      .preview-vacio {
        color: #9e9e9e;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }
      .preview-vacio mat-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
      }
      .row-icon {
        width: 28px;
        height: 28px;
        object-fit: contain;
        vertical-align: middle;
      }
      .row-icon-mat {
        vertical-align: middle;
      }
      .vacio {
        padding: 16px;
        color: #777;
      }
      table {
        width: 100%;
      }
    `,
  ],
})
export class DocumentosComponent {
  private ms2 = inject(Ms2DocumentosService);
  private snack = inject(MatSnackBar);

  cols = ['icono', 'nombre', 'envio', 'tipo', 'fecha', 'hash', 'acciones'];
  tipos = TIPOS_DOCUMENTO;

  documentos = signal<Documento[]>([]);
  archivo = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  cargando = signal(false);
  subiendo = signal(false);

  uploadEnvioId = '';
  uploadTipo: string = TIPOS_DOCUMENTO[0];
  uploadNombre = '';
  busquedaEnvioId = '';

  constructor() {
    this.verTodos();
  }

  // ---- extensiones / iconos ----
  private ext(nombre: string): string {
    const i = nombre.lastIndexOf('.');
    return i >= 0 ? nombre.slice(i + 1).toLowerCase() : '';
  }

  esImagen(nombre: string): boolean {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(this.ext(nombre));
  }

  // Logo segun extension (pdf/word/excel). null si es imagen u otro.
  logoDe(nombre: string): string | null {
    const e = this.ext(nombre);
    if (e === 'pdf') return 'assets/pdf-logo.jpg';
    if (['xls', 'xlsx', 'csv'].includes(e)) return 'assets/excel-logo.jpg';
    if (['doc', 'docx'].includes(e)) return 'assets/word-logo.jpg';
    return null;
  }

  // ---- carga del archivo a subir ----
  onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    // Libera la URL previa para no fugar memoria.
    const prev = this.previewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.archivo.set(file);
    this.previewUrl.set(file && this.esImagen(file.name) ? URL.createObjectURL(file) : null);
  }

  // Nombre con el que se guardara (preview).
  nombreFinal(): string {
    const file = this.archivo();
    if (!file) return '';
    const nombre = this.uploadNombre.trim();
    if (!nombre) return file.name;
    if (nombre.includes('.') || !file.name.includes('.')) return nombre;
    return nombre + file.name.slice(file.name.lastIndexOf('.'));
  }

  puedeSubir(): boolean {
    return !!this.archivo() && !!this.uploadEnvioId.trim() && !!this.uploadTipo;
  }

  subir() {
    const file = this.archivo();
    if (!file || !this.puedeSubir()) return;
    this.subiendo.set(true);
    this.ms2.subir(file, this.uploadEnvioId.trim(), this.uploadTipo, this.uploadNombre).subscribe({
      next: () => {
        this.snack.open('Documento subido', 'Cerrar', { duration: 2500 });
        const prev = this.previewUrl();
        if (prev) URL.revokeObjectURL(prev);
        this.archivo.set(null);
        this.previewUrl.set(null);
        this.uploadNombre = '';
        this.recargar();
        this.subiendo.set(false);
      },
      error: (e) => {
        this.snack.open(this.mensajeError(e, 'No se pudo subir'), 'Cerrar', { duration: 4000 });
        this.subiendo.set(false);
      },
    });
  }

  // ---- listado ----
  buscar() {
    this.cargar(this.busquedaEnvioId.trim());
  }

  verTodos() {
    this.busquedaEnvioId = '';
    this.cargar();
  }

  // Recarga respetando el filtro actual.
  private recargar() {
    this.cargar(this.busquedaEnvioId.trim());
  }

  private cargar(envioId?: string) {
    this.cargando.set(true);
    this.ms2.listar(envioId).subscribe({
      next: (docs) => {
        this.documentos.set(docs ?? []);
        this.cargando.set(false);
      },
      error: (e) => {
        this.snack.open(this.mensajeError(e, 'Error al listar'), 'Cerrar', { duration: 4000 });
        this.cargando.set(false);
      },
    });
  }

  descargar(doc: Documento) {
    this.ms2.urlDescarga(doc.docId).subscribe({
      next: (res) => window.open(res.url, '_blank'),
      error: (e) =>
        this.snack.open(this.mensajeError(e, 'No se pudo descargar'), 'Cerrar', { duration: 4000 }),
    });
  }

  eliminar(doc: Documento) {
    if (!confirm(`¿Eliminar "${doc.nombreArchivo}"? (eliminación lógica)`)) return;
    this.ms2.eliminar(doc.docId).subscribe({
      next: () => {
        this.snack.open('Documento eliminado', 'Cerrar', { duration: 2500 });
        this.documentos.update((list) => list.filter((d) => d.docId !== doc.docId));
      },
      error: (e) =>
        this.snack.open(this.mensajeError(e, 'No se pudo eliminar'), 'Cerrar', { duration: 4000 }),
    });
  }

  private mensajeError(e: any, fallback: string): string {
    if (e?.status === 401) return 'No autorizado: inicia sesión de nuevo';
    if (e?.status === 403) return 'Sin permiso para esta operación';
    if (e?.status === 0) return 'No se pudo contactar al MS2 (¿está corriendo?)';
    return e?.error?.error ?? e?.message ?? fallback;
  }
}
