import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Apollo, gql } from 'apollo-angular';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';
import { Ms3ReportesService } from '../../services/ms3-reportes.service';
import { Ms3DatasetsService } from '../../services/ms3-datasets.service';

const CLIENTES_COUNT = gql`
  query ClientesCount {
    clientes {
      id
    }
  }
`;

interface Acceso {
  path: string;
  icon: string;
  titulo: string;
  sub: string;
  soloAdmin?: boolean;
}

interface Kpi {
  icon: string;
  valor: string;
  label: string;
  tono: 'ink' | 'ok' | 'warn' | 'bad' | 'accent';
}

// Dashboard: saludo + KPIs en vivo (MS1/MS3, best-effort) + accesos rápidos.
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="page">
      <header class="hero">
        <div>
          <h2>Bienvenido, {{ auth.nombre || 'Usuario' }}</h2>
          <p class="sub">Panel de administración del Sistema de Courier Inteligente</p>
        </div>
        <div class="hero-meta">
          <span class="fecha">{{ hoy }}</span>
          <span class="rol-chip">{{ rolLabel }}</span>
        </div>
      </header>

      @if (kpis().length) {
        <section class="kpi-grid">
          @for (k of kpis(); track k.label) {
            <div class="kpi" [class]="'t-' + k.tono">
              <span class="kpi-ic"><mat-icon>{{ k.icon }}</mat-icon></span>
              <div class="kpi-txt">
                <b>{{ k.valor }}</b>
                <span>{{ k.label }}</span>
              </div>
            </div>
          }
        </section>
        @if (parcial()) {
          <p class="aviso"><mat-icon>info</mat-icon> Algunas métricas no se pudieron cargar (¿MS3/Gateway arriba?). Se muestran las disponibles.</p>
        }
      }

      <h3 class="sec">Accesos rápidos</h3>
      <section class="acc-grid">
        @for (a of accesosVisibles(); track a.path) {
          <a class="acc" [routerLink]="a.path">
            <span class="acc-ic"><mat-icon>{{ a.icon }}</mat-icon></span>
            <div class="acc-txt">
              <b>{{ a.titulo }}</b>
              <span>{{ a.sub }}</span>
            </div>
            <mat-icon class="acc-arrow">arrow_forward</mat-icon>
          </a>
        }
      </section>
    </div>
  `,
  styles: [
    `
      .hero {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 24px;
      }
      .hero h2 {
        margin: 0;
        font-size: 30px;
        font-weight: 600;
      }
      .hero .sub {
        color: var(--muted);
        font-size: 14px;
        margin: 5px 0 0;
      }
      .hero-meta {
        display: flex;
        align-items: center;
        gap: 10px;
        padding-top: 6px;
      }
      .fecha {
        font-size: 13px;
        color: var(--muted);
        text-transform: capitalize;
      }
      .rol-chip {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--accent);
        background: var(--accent-soft);
        padding: 4px 11px;
        border-radius: 999px;
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
        gap: 14px;
        margin-bottom: 8px;
      }
      .kpi {
        display: flex;
        align-items: center;
        gap: 13px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--radius);
        padding: 16px 18px;
        box-shadow: var(--shadow);
      }
      .kpi-ic {
        width: 46px;
        height: 46px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        flex: none;
        background: var(--surface-2);
      }
      .kpi-ic mat-icon {
        font-size: 24px;
        height: 24px;
        width: 24px;
      }
      .kpi-txt {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .kpi-txt b {
        font-family: 'Fraunces', Georgia, serif;
        font-size: 26px;
        font-weight: 600;
        color: var(--ink);
        line-height: 1.1;
      }
      .kpi-txt span {
        font-size: 12.5px;
        color: var(--muted);
        margin-top: 2px;
      }
      .t-ink .kpi-ic mat-icon { color: var(--ink); }
      .t-accent .kpi-ic { background: var(--accent-soft); }
      .t-accent .kpi-ic mat-icon { color: var(--accent); }
      .t-ok .kpi-ic { background: rgba(77, 124, 74, 0.13); }
      .t-ok .kpi-ic mat-icon { color: var(--ok); }
      .t-warn .kpi-ic { background: rgba(180, 83, 9, 0.13); }
      .t-warn .kpi-ic mat-icon { color: var(--warn); }
      .t-bad .kpi-ic { background: rgba(161, 59, 47, 0.13); }
      .t-bad .kpi-ic mat-icon { color: var(--bad); }

      .aviso {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12.5px;
        color: var(--muted);
        margin: 12px 0 0;
      }
      .aviso mat-icon {
        font-size: 17px;
        height: 17px;
        width: 17px;
      }

      .sec {
        font-size: 17px;
        font-weight: 600;
        margin: 30px 0 14px;
      }
      .acc-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(255px, 1fr));
        gap: 14px;
      }
      .acc {
        display: flex;
        align-items: center;
        gap: 14px;
        text-decoration: none;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: var(--radius);
        padding: 17px 18px;
        box-shadow: var(--shadow);
        transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      }
      .acc:hover {
        transform: translateY(-3px);
        border-color: var(--accent);
        box-shadow: 0 14px 30px -16px rgba(28, 25, 23, 0.34);
      }
      .acc-ic {
        width: 48px;
        height: 48px;
        border-radius: 13px;
        background: var(--accent-soft);
        display: grid;
        place-items: center;
        flex: none;
      }
      .acc-ic mat-icon {
        color: var(--accent);
        font-size: 26px;
        height: 26px;
        width: 26px;
      }
      .acc-txt {
        flex: 1;
        min-width: 0;
      }
      .acc-txt b {
        display: block;
        font-size: 15px;
        font-weight: 600;
        color: var(--ink);
      }
      .acc-txt span {
        font-size: 12.5px;
        color: var(--muted);
      }
      .acc-arrow {
        color: var(--line-2);
        font-size: 20px;
        height: 20px;
        width: 20px;
        transition: transform 0.15s ease, color 0.15s ease;
      }
      .acc:hover .acc-arrow {
        color: var(--accent);
        transform: translateX(3px);
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  auth = inject(AuthService);
  private apollo = inject(Apollo);
  private reportes = inject(Ms3ReportesService);
  private datasets = inject(Ms3DatasetsService);

  private envios = signal<number | null>(null);
  private aTiempo = signal<number | null>(null);
  private clientes = signal<number | null>(null);
  private zonas = signal<number | null>(null);
  private incidentes = signal<number | null>(null);
  private fallos = signal(0);

  get esAdmin(): boolean {
    return this.auth.rol === 'ADMIN';
  }

  get rolLabel(): string {
    const r = (this.auth.rol ?? '').toUpperCase();
    return { ADMIN: 'Administrador', CLIENTE: 'Cliente', ASESOR: 'Asesor' }[r] ?? r ?? '';
  }

  get hoy(): string {
    return new Date().toLocaleDateString('es-BO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  }

  // KPIs que ya cargaron (los nulos se omiten para no mostrar tarjetas vacías).
  kpis = computed<Kpi[]>(() => {
    const out: Kpi[] = [];
    const fmt = (n: number) => new Intl.NumberFormat('es-BO').format(n);
    if (this.envios() != null) out.push({ icon: 'local_shipping', valor: fmt(this.envios()!), label: 'Envíos registrados', tono: 'ink' });
    if (this.aTiempo() != null) out.push({ icon: 'schedule', valor: this.aTiempo() + '%', label: 'Entregas a tiempo', tono: 'ok' });
    if (this.clientes() != null) out.push({ icon: 'groups', valor: fmt(this.clientes()!), label: 'Clientes', tono: 'accent' });
    if (this.zonas() != null) out.push({ icon: 'pin_drop', valor: fmt(this.zonas()!), label: 'Zonas analizadas', tono: 'warn' });
    if (this.incidentes() != null) out.push({ icon: 'report', valor: fmt(this.incidentes()!), label: 'Incidentes', tono: 'bad' });
    return out;
  });

  // Hubo algún error de carga pero al menos un KPI cargó.
  parcial = computed(() => this.fallos() > 0 && this.kpis().length > 0);

  private accesos: Acceso[] = [
    { path: '/clientes', icon: 'groups', titulo: 'Clientes', sub: 'Registrar y consultar clientes' },
    { path: '/servicios', icon: 'inventory_2', titulo: 'Servicios', sub: 'Tipos de servicio y tarifas base' },
    { path: '/tarifas', icon: 'request_quote', titulo: 'Calcular tarifa', sub: 'Cotizar por peso y zona' },
    { path: '/encomiendas', icon: 'local_shipping', titulo: 'Encomiendas', sub: 'Crear envíos y ver tracking' },
    { path: '/documentos', icon: 'description', titulo: 'Documentos', sub: 'Guías y comprobantes (S3)' },
    { path: '/mapa', icon: 'map', titulo: 'Mapa operativo', sub: 'Ruta, zonas y riesgo', soloAdmin: true },
    { path: '/inteligencia', icon: 'psychology', titulo: 'Inteligencia', sub: 'IA, predicción y K-Means', soloAdmin: true },
    { path: '/reportes', icon: 'bar_chart', titulo: 'Reportes', sub: 'KPIs y dashboards BI', soloAdmin: true },
  ];

  accesosVisibles = computed(() =>
    this.accesos.filter((a) => !a.soloAdmin || this.esAdmin),
  );

  ngOnInit() {
    // Clientes (MS1 GraphQL) — todos los roles con acceso al panel.
    this.apollo
      .query<{ clientes: { id: string }[] }>({ query: CLIENTES_COUNT, fetchPolicy: 'network-only' })
      .subscribe({
        next: (r) => this.clientes.set(r.data?.clientes?.length ?? 0),
        error: () => this.fallos.update((n) => n + 1),
      });

    // Métricas operativas (MS3) — solo ADMIN tiene los endpoints.
    if (this.esAdmin) {
      this.reportes.operacion().subscribe({
        next: (o) => {
          this.envios.set(o.total_envios);
          this.aTiempo.set(Math.round(o.entregados_a_tiempo_pct));
        },
        error: () => this.fallos.update((n) => n + 1),
      });
      this.datasets.resumen().subscribe({
        next: (d) => {
          this.zonas.set(d.zonas);
          this.incidentes.set(d.incidentes);
        },
        error: () => this.fallos.update((n) => n + 1),
      });
    }
  }
}
