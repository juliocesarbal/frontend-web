import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface Servicio {
  id: string;
  nombre: string;
  pesoMaximo: number;
  tiempoEstimado: number;
  tarifaBase: number;
  activo: boolean;
}

const SERVICIOS = gql`
  query Servicios {
    servicios {
      id
      nombre
      pesoMaximo
      tiempoEstimado
      tarifaBase
      activo
    }
  }
`;
const CREAR_SERVICIO = gql`
  mutation CrearServicio($input: ServicioInput!) {
    crearServicio(input: $input) {
      id
    }
  }
`;
const DESACTIVAR = gql`
  mutation Desactivar($id: ID!) {
    desactivarServicio(id: $id)
  }
`;

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <h2>Servicios courier</h2>

      <mat-card class="form-card">
        <h3>Nuevo servicio</h3>
        <form [formGroup]="form" (ngSubmit)="crear()" class="row">
          <mat-form-field appearance="outline">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="nombre" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Descripción</mat-label>
            <input matInput formControlName="descripcion" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Peso máx (kg)</mat-label>
            <input matInput type="number" formControlName="pesoMaximo" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Tiempo (h)</mat-label>
            <input matInput type="number" formControlName="tiempoEstimado" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Tarifa base</mat-label>
            <input matInput type="number" formControlName="tarifaBase" />
          </mat-form-field>
          <button mat-raised-button color="primary" [disabled]="form.invalid">
            <mat-icon>add</mat-icon> Crear
          </button>
        </form>
      </mat-card>

      <mat-card>
        <table mat-table [dataSource]="servicios()">
          <ng-container matColumnDef="nombre">
            <th mat-header-cell *matHeaderCellDef>Nombre</th>
            <td mat-cell *matCellDef="let s">{{ s.nombre }}</td>
          </ng-container>
          <ng-container matColumnDef="pesoMaximo">
            <th mat-header-cell *matHeaderCellDef>Peso máx</th>
            <td mat-cell *matCellDef="let s">{{ s.pesoMaximo }} kg</td>
          </ng-container>
          <ng-container matColumnDef="tiempoEstimado">
            <th mat-header-cell *matHeaderCellDef>Tiempo</th>
            <td mat-cell *matCellDef="let s">{{ s.tiempoEstimado }} h</td>
          </ng-container>
          <ng-container matColumnDef="tarifaBase">
            <th mat-header-cell *matHeaderCellDef>Tarifa base</th>
            <td mat-cell *matCellDef="let s">{{ s.tarifaBase | number: '1.2-2' }}</td>
          </ng-container>
          <ng-container matColumnDef="activo">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let s">{{ s.activo ? 'Activo' : 'Inactivo' }}</td>
          </ng-container>
          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let s">
              @if (s.activo) {
                <button mat-icon-button color="warn" (click)="desactivar(s.id)" title="Desactivar">
                  <mat-icon>block</mat-icon>
                </button>
              }
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
      </mat-card>
    </div>
  `,
  styles: [`.form-card { margin-bottom: 16px; padding: 16px; }`],
})
export class ServiciosComponent {
  private apollo = inject(Apollo);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  cols = ['nombre', 'pesoMaximo', 'tiempoEstimado', 'tarifaBase', 'activo', 'acciones'];
  servicios = signal<Servicio[]>([]);

  form = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: [''],
    pesoMaximo: [1, [Validators.required, Validators.min(0.1)]],
    tiempoEstimado: [24, [Validators.required, Validators.min(1)]],
    tarifaBase: [10, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    this.cargar();
  }

  cargar() {
    this.apollo
      .query<{ servicios: Servicio[] }>({ query: SERVICIOS })
      .subscribe((res) => this.servicios.set(res.data?.servicios ?? []));
  }

  crear() {
    if (this.form.invalid) return;
    const v = this.form.value;
    const input = {
      nombre: v.nombre,
      descripcion: v.descripcion || null,
      pesoMaximo: Number(v.pesoMaximo),
      tiempoEstimado: Number(v.tiempoEstimado),
      tarifaBase: Number(v.tarifaBase),
    };
    this.apollo.mutate({ mutation: CREAR_SERVICIO, variables: { input } }).subscribe({
      next: () => {
        this.snack.open('Servicio creado', 'Cerrar', { duration: 2500 });
        this.form.reset({ pesoMaximo: 1, tiempoEstimado: 24, tarifaBase: 10 });
        this.cargar();
      },
      error: (e) => this.snack.open(e.message ?? 'Error', 'Cerrar', { duration: 3500 }),
    });
  }

  desactivar(id: string) {
    this.apollo.mutate({ mutation: DESACTIVAR, variables: { id } }).subscribe({
      next: () => {
        this.snack.open('Servicio desactivado', 'Cerrar', { duration: 2500 });
        this.cargar();
      },
      error: (e) => this.snack.open(e.message ?? 'Error', 'Cerrar', { duration: 3500 }),
    });
  }
}
