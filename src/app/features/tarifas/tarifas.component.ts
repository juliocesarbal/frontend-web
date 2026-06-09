import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Apollo, gql } from 'apollo-angular';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface Opcion {
  id: string;
  nombre: string;
}
interface Resultado {
  costo: number;
  servicio: string;
  zonaCubierta: boolean;
}

const CATALOGOS = gql`
  query Catalogos {
    servicios(activos: true) {
      id
      nombre
    }
    zonas {
      id
      nombre
    }
  }
`;
const CALCULAR = gql`
  query Calcular($input: CalcularTarifaInput!) {
    calcularTarifa(input: $input) {
      costo
      servicio
      zonaCubierta
    }
  }
`;

@Component({
  selector: 'app-tarifas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="page">
      <h2>Calcular tarifa</h2>
      <mat-card class="form-card">
        <form [formGroup]="form" (ngSubmit)="calcular()" class="row">
          <mat-form-field appearance="outline">
            <mat-label>Servicio</mat-label>
            <mat-select formControlName="servicioId">
              @for (s of servicios(); track s.id) {
                <mat-option [value]="s.id">{{ s.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Peso (kg)</mat-label>
            <input matInput type="number" formControlName="peso" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Zona origen</mat-label>
            <mat-select formControlName="zonaOrigenId">
              @for (z of zonas(); track z.id) {
                <mat-option [value]="z.id">{{ z.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Zona destino</mat-label>
            <mat-select formControlName="zonaDestinoId">
              @for (z of zonas(); track z.id) {
                <mat-option [value]="z.id">{{ z.nombre }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button mat-raised-button color="primary" [disabled]="form.invalid">
            <mat-icon>calculate</mat-icon> Calcular
          </button>
        </form>
      </mat-card>

      @if (resultado(); as r) {
        <mat-card class="resultado">
          @if (r.zonaCubierta) {
            <h3>Costo estimado: {{ r.costo | number: '1.2-2' }} Bs</h3>
            <p>Servicio: {{ r.servicio }}</p>
          } @else {
            <h3 class="no-cubierta">Zona no cubierta o peso fuera de rango</h3>
            <p>Servicio: {{ r.servicio }}</p>
          }
        </mat-card>
      }
    </div>
  `,
  styles: [
    `
      .form-card {
        margin-bottom: 16px;
        padding: 16px;
      }
      .resultado {
        padding: 16px;
      }
      .no-cubierta {
        color: #d32f2f;
      }
    `,
  ],
})
export class TarifasComponent {
  private apollo = inject(Apollo);
  private fb = inject(FormBuilder);

  servicios = signal<Opcion[]>([]);
  zonas = signal<Opcion[]>([]);
  resultado = signal<Resultado | null>(null);

  form = this.fb.group({
    servicioId: ['', Validators.required],
    peso: [1, [Validators.required, Validators.min(0.1)]],
    zonaOrigenId: ['', Validators.required],
    zonaDestinoId: ['', Validators.required],
  });

  constructor() {
    this.apollo
      .query<{ servicios: Opcion[]; zonas: Opcion[] }>({ query: CATALOGOS })
      .subscribe((res) => {
        this.servicios.set(res.data?.servicios ?? []);
        this.zonas.set(res.data?.zonas ?? []);
      });
  }

  calcular() {
    if (this.form.invalid) return;
    const v = this.form.value;
    const input = {
      servicioId: Number(v.servicioId),
      peso: Number(v.peso),
      zonaOrigenId: Number(v.zonaOrigenId),
      zonaDestinoId: Number(v.zonaDestinoId),
    };
    this.apollo
      .query<{ calcularTarifa: Resultado }>({ query: CALCULAR, variables: { input } })
      .subscribe((res) => this.resultado.set(res.data?.calcularTarifa ?? null));
  }
}
