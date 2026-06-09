import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

const REGISTRAR_CLIENTE = gql`
  mutation RegistrarCliente($input: ClienteInput!) {
    registrarCliente(input: $input) {
      id
      nombre
    }
  }
`;

// Modal para registrar un cliente nuevo (mutation GraphQL a MS1). Cierra con `true`
// si se creó, para que la lista padre recargue.
@Component({
  selector: 'app-cliente-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title><mat-icon class="th">person_add</mat-icon> Nuevo cliente</h2>
    @if (guardando()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }
    <mat-dialog-content>
      <form [formGroup]="form" class="grid">
        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="nombre" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Correo</mat-label>
          <input matInput type="email" formControlName="email" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>CI / NIT</mat-label>
          <input matInput formControlName="ciNit" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Teléfono</mat-label>
          <input matInput formControlName="telefono" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="col2">
          <mat-label>Dirección</mat-label>
          <input matInput formControlName="direccion" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="guardando()">Cancelar</button>
      <button mat-raised-button color="primary" [disabled]="form.invalid || guardando()" (click)="guardar()">
        <mat-icon>save</mat-icon> Guardar
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .th { vertical-align: middle; margin-right: 6px; color: var(--accent); }
      h2 { display: flex; align-items: center; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; padding-top: 8px; min-width: 460px; }
      .col2 { grid-column: 1 / -1; }
      @media (max-width: 540px) { .grid { grid-template-columns: 1fr; min-width: 0; } }
    `,
  ],
})
export class ClienteFormDialog {
  private fb = inject(FormBuilder);
  private apollo = inject(Apollo);
  private ref = inject(MatDialogRef<ClienteFormDialog>);
  private snack = inject(MatSnackBar);

  guardando = signal(false);

  form = this.fb.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    ciNit: [''],
    telefono: [''],
    direccion: [''],
  });

  guardar() {
    if (this.form.invalid) return;
    this.guardando.set(true);
    this.apollo.mutate({ mutation: REGISTRAR_CLIENTE, variables: { input: this.form.value } }).subscribe({
      next: () => {
        this.snack.open('Cliente registrado', 'Cerrar', { duration: 2500 });
        this.ref.close(true);
      },
      error: (e) => {
        this.snack.open(e.message ?? 'Error al registrar', 'Cerrar', { duration: 3500 });
        this.guardando.set(false);
      },
    });
  }
}
