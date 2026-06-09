import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Encomienda, Ms3EncomiendasService } from '../../services/ms3-encomiendas.service';
import { Ms3DatasetsService, Sucursal } from '../../services/ms3-datasets.service';

const SERVICIOS = ['DOCUMENTO', 'PAQUETE_NORMAL', 'CARGA_PESADA', 'EXPRESS'];

interface ClienteOpt {
  id: string;
  nombre: string;
  direccion?: string;
}

const CLIENTES = gql`
  query ClientesEncomienda {
    clientes {
      id
      nombre
      direccion
    }
  }
`;

// Modal para registrar una encomienda. El cliente se ELIGE de los que existen en MS1
// (no se escribe a mano). Crea vía MS3 y cierra con la encomienda creada.
@Component({
  selector: 'app-encomienda-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title><mat-icon class="th">add_box</mat-icon> Nueva encomienda</h2>
    @if (guardando()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    <mat-dialog-content>
      @if (clientes().length === 0) {
        <div class="aviso">
          <mat-icon>info</mat-icon>
          <span>No hay clientes. Registra un cliente antes de crear una encomienda.</span>
          <button mat-raised-button color="primary" (click)="irAClientes()">
            <mat-icon>person_add</mat-icon> Ir a Clientes
          </button>
        </div>
      } @else {
        <div class="grid">
          <mat-form-field appearance="outline" class="col2">
            <mat-label>Cliente</mat-label>
            <mat-select [(ngModel)]="form.cliente_id" (selectionChange)="onClienteSel()">
              @for (c of clientes(); track c.id) {
                <mat-option [value]="c.id">{{ c.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Sucursal origen</mat-label>
            <mat-select [(ngModel)]="form.sucursal_origen_id" (selectionChange)="onOrigenSel()">
              @for (s of sucursales(); track s.id) {
                <mat-option [value]="s.id">{{ s.ciudad }} — {{ s.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Sucursal destino</mat-label>
            <mat-select [(ngModel)]="form.sucursal_destino_id">
              @for (s of sucursales(); track s.id) {
                <mat-option [value]="s.id">{{ s.ciudad }} — {{ s.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="col2">
            <mat-label>Destino (dirección)</mat-label>
            <input matInput [(ngModel)]="form.destino" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Servicio</mat-label>
            <mat-select [(ngModel)]="form.servicio_ref">
              @for (s of servicios; track s) { <mat-option [value]="s">{{ s }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Zona</mat-label>
            <input matInput [(ngModel)]="form.zona_ref" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Peso (kg)</mat-label>
            <input matInput type="number" [(ngModel)]="form.peso" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Costo</mat-label>
            <input matInput type="number" [(ngModel)]="form.costo" />
          </mat-form-field>
        </div>
        <p class="hint"><mat-icon class="mini">link</mat-icon> Al crear se registra el evento <b>CREACION_GUIA</b> en blockchain.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="guardando()">Cancelar</button>
      <button
        mat-raised-button
        color="primary"
        [disabled]="!form.cliente_id || !form.sucursal_origen_id || !form.sucursal_destino_id || guardando()"
        (click)="crear()"
      >
        <mat-icon>save</mat-icon> Registrar
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .th { vertical-align: middle; margin-right: 6px; color: var(--accent); }
      h2 { display: flex; align-items: center; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; padding-top: 8px; min-width: 480px; }
      .col2 { grid-column: 1 / -1; }
      .aviso { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 16px; background: var(--accent-soft); border: 1px solid var(--line-2); border-radius: 10px; color: var(--accent); min-width: 360px; }
      .hint { display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 13px; margin: 4px 2px 0; }
      .mini { font-size: 16px; height: 16px; width: 16px; }
      @media (max-width: 560px) { .grid { grid-template-columns: 1fr; min-width: 0; } }
    `,
  ],
})
export class EncomiendaFormDialog {
  private ms3 = inject(Ms3EncomiendasService);
  private ds = inject(Ms3DatasetsService);
  private apollo = inject(Apollo);
  private ref = inject(MatDialogRef<EncomiendaFormDialog>);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  servicios = SERVICIOS;
  clientes = signal<ClienteOpt[]>([]);
  sucursales = signal<Sucursal[]>([]);
  guardando = signal(false);
  form: Partial<Encomienda> = { servicio_ref: 'PAQUETE_NORMAL' };

  constructor() {
    this.apollo.query<{ clientes: ClienteOpt[] }>({ query: CLIENTES }).subscribe({
      next: (res) => this.clientes.set(res.data?.clientes ?? []),
      error: () => this.snack.open('No se pudieron cargar clientes (¿MS1 arriba?)', 'Cerrar', { duration: 3500 }),
    });
    // Sucursales del MS3: nodos origen/destino -> el backend calcula la distancia real.
    this.ds.sucursales().subscribe({
      next: (s) => this.sucursales.set(s ?? []),
      error: () => this.snack.open('No se pudieron cargar sucursales (¿MS3 arriba?)', 'Cerrar', { duration: 3500 }),
    });
  }

  onClienteSel() {
    const c = this.clientes().find((x) => x.id === this.form.cliente_id);
    if (c?.direccion) this.form.destino = c.direccion;
  }

  onOrigenSel() {
    const s = this.sucursales().find((x) => x.id === this.form.sucursal_origen_id);
    if (s) this.form.origen = s.ciudad;
  }

  irAClientes() {
    this.ref.close();
    this.router.navigate(['/clientes']);
  }

  crear() {
    const c = this.clientes().find((x) => x.id === this.form.cliente_id);
    if (!c) {
      this.snack.open('Selecciona un cliente', 'Cerrar', { duration: 3000 });
      return;
    }
    if (!this.form.destino) {
      this.snack.open('El destino es obligatorio', 'Cerrar', { duration: 3000 });
      return;
    }
    if (!this.form.sucursal_origen_id || !this.form.sucursal_destino_id) {
      this.snack.open('Elegí sucursal origen y destino', 'Cerrar', { duration: 3000 });
      return;
    }
    if (this.form.sucursal_origen_id === this.form.sucursal_destino_id) {
      this.snack.open('Origen y destino deben ser sucursales distintas', 'Cerrar', { duration: 3000 });
      return;
    }
    this.guardando.set(true);
    const payload: Partial<Encomienda> = {
      cliente_id: c.id,
      cliente_nombre: c.nombre,
      cliente_direccion: c.direccion,
      origen: this.form.origen,
      destino: this.form.destino,
      servicio_ref: this.form.servicio_ref,
      zona_ref: this.form.zona_ref,
      peso: this.form.peso,
      costo: this.form.costo,
      sucursal_origen_id: this.form.sucursal_origen_id,
      sucursal_destino_id: this.form.sucursal_destino_id,
    };
    this.ms3.crear(payload).subscribe({
      next: (e) => {
        this.snack.open(`Encomienda ${e.tracking_code} creada (evento en blockchain)`, 'Cerrar', { duration: 3500 });
        this.ref.close(e);
      },
      error: (e) => {
        this.snack.open(this.err(e), 'Cerrar', { duration: 4000 });
        this.guardando.set(false);
      },
    });
  }

  private err(e: any): string {
    if (e?.status === 401) return 'No autorizado: inicia sesión de nuevo';
    if (e?.status === 403) return 'Sin permiso (requiere ADMIN)';
    if (e?.status === 0) return 'No se pudo contactar al MS3 (¿está corriendo?)';
    return e?.error?.detail ?? e?.message ?? 'No se pudo crear';
  }
}
