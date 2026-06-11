import { Component, computed, inject, signal } from '@angular/core';
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
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Ms3RutaService, Ruta } from '../../services/ms3-ruta.service';
import { Ms3EncomiendasService, Encomienda } from '../../services/ms3-encomiendas.service';

interface Asesor {
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

// Estados de encomienda elegibles para una ruta (aún operativas).
const ESTADOS_ACTIVOS = ['REGISTRADO', 'EN_TRANSITO', 'EN_REPARTO'];

@Component({
  selector: 'app-rutas',
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
    MatChipsModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page">
      <h2>Rutas de reparto</h2>
      <p class="sub">Asigna una ruta (un conjunto de encomiendas) a un asesor. El asesor la verá en su app móvil.</p>

      <mat-card class="form-card">
        <h3>Nueva ruta</h3>
        <form [formGroup]="form" (ngSubmit)="crear()">
          <div class="row">
            <mat-form-field appearance="outline">
              <mat-label>Asesor</mat-label>
              <mat-select formControlName="asesor_id">
                @for (a of asesores(); track a.id) {
                  <mat-option [value]="a.id">{{ a.nombre }} ({{ a.email }})</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Zona / referencia (opcional)</mat-label>
              <input matInput formControlName="zona_ref" placeholder="Ej. La Paz centro" />
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Encomiendas a incluir</mat-label>
            <mat-select formControlName="encomienda_ids" multiple>
              @for (e of disponibles(); track e.id) {
                <mat-option [value]="e.id">
                  {{ e.tracking_code }} · {{ e.destino || 'destino —' }} · {{ e.estado }}
                </mat-option>
              }
            </mat-select>
            <mat-hint>{{ disponibles().length }} encomienda(s) activas sin ruta</mat-hint>
          </mat-form-field>

          <button mat-raised-button color="primary" [disabled]="form.invalid || guardando()">
            <mat-icon>add_road</mat-icon> Crear ruta
          </button>
        </form>
      </mat-card>

      <mat-card>
        <h3>Rutas asignadas</h3>
        <table mat-table [dataSource]="rutas()">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef>Ruta</th>
            <td mat-cell *matCellDef="let r">#{{ r.id }}</td>
          </ng-container>
          <ng-container matColumnDef="asesor">
            <th mat-header-cell *matHeaderCellDef>Asesor</th>
            <td mat-cell *matCellDef="let r">{{ nombreAsesor(r.asesor_id) }}</td>
          </ng-container>
          <ng-container matColumnDef="zona">
            <th mat-header-cell *matHeaderCellDef>Zona</th>
            <td mat-cell *matCellDef="let r">{{ r.zona_ref || '—' }}</td>
          </ng-container>
          <ng-container matColumnDef="paradas">
            <th mat-header-cell *matHeaderCellDef>Paradas</th>
            <td mat-cell *matCellDef="let r">{{ r.encomiendas.length }}</td>
          </ng-container>
          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let r">{{ r.estado }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="cols"></tr>
          <tr mat-row *matRowDef="let row; columns: cols"></tr>
        </table>
        @if (rutas().length === 0) {
          <p class="empty">Aún no hay rutas asignadas.</p>
        }
      </mat-card>
    </div>
  `,
  styles: [
    `
      .page { padding: 8px 4px; }
      .sub { color: var(--muted); margin: -6px 0 16px; }
      .form-card { margin-bottom: 16px; padding: 16px; }
      .row { display: flex; gap: 12px; flex-wrap: wrap; }
      .row mat-form-field { flex: 1; min-width: 240px; }
      .full { width: 100%; }
      .empty { color: var(--muted); padding: 12px; }
      table { width: 100%; }
    `,
  ],
})
export class RutasComponent {
  private apollo = inject(Apollo);
  private fb = inject(FormBuilder);
  private snack = inject(MatSnackBar);
  private rutaSvc = inject(Ms3RutaService);
  private encSvc = inject(Ms3EncomiendasService);

  cols = ['id', 'asesor', 'zona', 'paradas', 'estado'];
  asesores = signal<Asesor[]>([]);
  rutas = signal<Ruta[]>([]);
  encomiendas = signal<Encomienda[]>([]);
  guardando = signal(false);

  // Encomiendas activas que aún no están en ninguna ruta.
  disponibles = computed(() => {
    const asignadas = new Set<number>();
    for (const r of this.rutas()) for (const e of r.encomiendas) asignadas.add(e.id);
    return this.encomiendas().filter(
      (e) => ESTADOS_ACTIVOS.includes(e.estado) && !asignadas.has(e.id),
    );
  });

  form = this.fb.group({
    asesor_id: ['', Validators.required],
    zona_ref: [''],
    encomienda_ids: [[] as number[], Validators.required],
  });

  constructor() {
    this.cargarAsesores();
    this.cargarRutas();
    this.cargarEncomiendas();
  }

  cargarAsesores() {
    this.apollo
      .query<{ usuarios: Asesor[] }>({ query: USUARIOS, fetchPolicy: 'network-only' })
      .subscribe((res) =>
        this.asesores.set((res.data?.usuarios ?? []).filter((u) => u.rol === 'ASESOR' && u.activo)),
      );
  }

  cargarRutas() {
    this.rutaSvc.listarRutas().subscribe((rs) => this.rutas.set(rs));
  }

  cargarEncomiendas() {
    this.encSvc.listar().subscribe((es) => this.encomiendas.set(es));
  }

  nombreAsesor(id: string): string {
    const a = this.asesores().find((x) => x.id === String(id));
    return a ? a.nombre : `Asesor ${id}`;
  }

  crear() {
    if (this.form.invalid) return;
    const v = this.form.value;
    this.guardando.set(true);
    this.rutaSvc
      .crearRuta({
        asesor_id: v.asesor_id!,
        zona_ref: v.zona_ref?.trim() || null,
        encomienda_ids: v.encomienda_ids ?? [],
      })
      .subscribe({
        next: (ruta) => {
          this.snack.open(`Ruta #${ruta.id} asignada`, 'Cerrar', { duration: 2800 });
          this.form.reset({ asesor_id: '', zona_ref: '', encomienda_ids: [] });
          this.guardando.set(false);
          this.cargarRutas();
          this.cargarEncomiendas();
        },
        error: (e) => {
          this.snack.open(e?.error?.detail ?? e.message ?? 'Error al crear la ruta', 'Cerrar', {
            duration: 3800,
          });
          this.guardando.set(false);
        },
      });
  }
}
