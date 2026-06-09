import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
}

const USUARIOS = gql`
  query Usuarios {
    usuarios {
      id
      nombre
      email
      rol
      activo
    }
  }
`;
const CREAR_USUARIO = gql`
  mutation CrearUsuario($input: UsuarioInput!) {
    crearUsuario(input: $input) {
      id
    }
  }
`;

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <h2>Usuarios internos</h2>

      <mat-card class="form-card">
        <h3>Nuevo usuario</h3>
        <form [formGroup]="form" (ngSubmit)="crear()" class="row">
          <mat-form-field appearance="outline">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="nombre" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Correo</mat-label>
            <input matInput type="email" formControlName="email" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Contraseña</mat-label>
            <input matInput type="password" formControlName="password" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Rol</mat-label>
            <mat-select formControlName="rol">
              <mat-option value="ADMIN">Administrador</mat-option>
              <mat-option value="ASESOR">Asesor</mat-option>
              <mat-option value="CLIENTE">Cliente</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-raised-button color="primary" [disabled]="form.invalid">
            <mat-icon>person_add</mat-icon> Crear
          </button>
        </form>
      </mat-card>

      <mat-card>
        <table mat-table [dataSource]="usuarios()">
          <ng-container matColumnDef="nombre">
            <th mat-header-cell *matHeaderCellDef>Nombre</th>
            <td mat-cell *matCellDef="let u">{{ u.nombre }}</td>
          </ng-container>
          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef>Correo</th>
            <td mat-cell *matCellDef="let u">{{ u.email }}</td>
          </ng-container>
          <ng-container matColumnDef="rol">
            <th mat-header-cell *matHeaderCellDef>Rol</th>
            <td mat-cell *matCellDef="let u">{{ u.rol }}</td>
          </ng-container>
          <ng-container matColumnDef="activo">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let u">{{ u.activo ? 'Activo' : 'Inactivo' }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
      </mat-card>
    </div>
  `,
  styles: [`.form-card { margin-bottom: 16px; padding: 16px; }`],
})
export class UsuariosComponent {
  private apollo = inject(Apollo);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  cols = ['nombre', 'email', 'rol', 'activo'];
  usuarios = signal<Usuario[]>([]);

  form = this.fb.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rol: ['ASESOR', Validators.required],
  });

  constructor() {
    this.cargar();
  }

  cargar() {
    this.apollo
      .query<{ usuarios: Usuario[] }>({ query: USUARIOS })
      .subscribe((res) => this.usuarios.set(res.data?.usuarios ?? []));
  }

  crear() {
    if (this.form.invalid) return;
    this.apollo
      .mutate({ mutation: CREAR_USUARIO, variables: { input: this.form.value } })
      .subscribe({
        next: () => {
          this.snack.open('Usuario creado', 'Cerrar', { duration: 2500 });
          this.form.reset({ rol: 'ASESOR' });
          this.cargar();
        },
        error: (e) => this.snack.open(e.message ?? 'Error', 'Cerrar', { duration: 3500 }),
      });
  }
}
