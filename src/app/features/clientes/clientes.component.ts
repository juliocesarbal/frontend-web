import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Apollo, gql } from 'apollo-angular';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ClienteFormDialog } from './cliente-form.dialog';

interface Cliente {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  ciNit?: string;
  direccion?: string;
}

const CLIENTES = gql`
  query Clientes($filtro: String) {
    clientes(filtro: $filtro) {
      id
      nombre
      email
      telefono
      ciNit
      direccion
    }
  }
`;

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h2>Clientes</h2>
          <div class="sub">Registro de clientes del courier (MS1)</div>
        </div>
        <button mat-raised-button color="primary" (click)="nuevo()">
          <mat-icon>add</mat-icon> Nuevo cliente
        </button>
      </div>

      <mat-card>
        @if (cargando()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
        <table mat-table [dataSource]="clientes()">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>ID</th>
            <td mat-cell *matCellDef="let c">{{ c.id }}</td>
          </ng-container>
          <ng-container matColumnDef="nombre">
            <th mat-header-cell *matHeaderCellDef>Nombre</th>
            <td mat-cell *matCellDef="let c">{{ c.nombre }}</td>
          </ng-container>
          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Correo</th>
            <td mat-cell *matCellDef="let c">{{ c.email }}</td>
          </ng-container>
          <ng-container matColumnDef="telefono">
            <th mat-header-cell *matHeaderCellDef>Teléfono</th>
            <td mat-cell *matCellDef="let c">{{ c.telefono || '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="direccion">
            <th mat-header-cell *matHeaderCellDef>Dirección</th>
            <td mat-cell *matCellDef="let c">{{ c.direccion || '—' }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
        @if (!cargando() && clientes().length === 0) {
          <div class="empty">
            <mat-icon>group_off</mat-icon>
            <p>Sin clientes registrados. Crea el primero con “Nuevo cliente”.</p>
          </div>
        }
      </mat-card>
    </div>
  `,
})
export class ClientesComponent {
  private apollo = inject(Apollo);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  cols = ['id', 'nombre', 'email', 'telefono', 'direccion'];
  clientes = signal<Cliente[]>([]);
  cargando = signal(false);

  constructor() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.apollo.query<{ clientes: Cliente[] }>({ query: CLIENTES }).subscribe({
      next: (res) => {
        this.clientes.set(res.data?.clientes ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.snack.open('Error al cargar clientes', 'Cerrar', { duration: 3000 });
        this.cargando.set(false);
      },
    });
  }

  nuevo() {
    this.dialog
      .open(ClienteFormDialog, { width: '560px', autoFocus: 'first-tabbable' })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) this.cargar();
      });
  }
}
