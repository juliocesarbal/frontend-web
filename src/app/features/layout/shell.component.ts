import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/auth/auth.service';

interface SubItem {
  label: string;
  path: string;
}
interface NavItem {
  label: string;
  icon: string;
  path: string;
  soloAdmin?: boolean;
  children?: SubItem[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
  ],
  template: `
    <mat-toolbar class="topbar">
      <button mat-icon-button (click)="drawer.toggle()"><mat-icon>menu</mat-icon></button>
      <div class="brand">
        <span class="brand-mark">C</span>
        <span class="brand-txt">Courier <b>Inteligente</b></span>
      </div>
      <span class="spacer"></span>
      <button mat-button class="user-btn" [matMenuTriggerFor]="menu">
        <span class="avatar">{{ iniciales }}</span>
        <span class="user-meta">
          <span class="user-name">{{ auth.nombre }}</span>
          <span class="user-rol">{{ auth.rol }}</span>
        </span>
        <mat-icon>expand_more</mat-icon>
      </button>
      <mat-menu #menu="matMenu">
        <button mat-menu-item (click)="auth.logout()"><mat-icon>logout</mat-icon> Cerrar sesión</button>
      </mat-menu>
    </mat-toolbar>

    <mat-sidenav-container class="container">
      <mat-sidenav #drawer mode="side" opened class="sidenav">
        <div class="nav-caption">NAVEGACIÓN</div>
        <nav class="nav">
          @for (item of items; track item.label) {
            @if (!item.soloAdmin || auth.rol === 'ADMIN') {
              @if (item.children) {
                <button class="nav-item" [class.active]="isGroupActive(item)" (click)="abrirGrupo(item)">
                  <mat-icon>{{ item.icon }}</mat-icon>
                  <span class="lbl">{{ item.label }}</span>
                  <mat-icon class="chev" [class.open]="openGroup() === item.label">expand_more</mat-icon>
                </button>
                @if (openGroup() === item.label) {
                  <div class="subnav">
                    @for (ch of item.children; track ch.path) {
                      <a class="nav-sub" [routerLink]="ch.path" routerLinkActive="active-sub">
                        <span class="dot"></span>{{ ch.label }}
                      </a>
                    }
                  </div>
                }
              } @else {
                <a class="nav-item" [routerLink]="item.path" routerLinkActive="active">
                  <mat-icon>{{ item.icon }}</mat-icon>
                  <span class="lbl">{{ item.label }}</span>
                </a>
              }
            }
          }
        </nav>
        <div class="nav-foot">Grupo&nbsp;#11 · UAGRM</div>
      </mat-sidenav>

      <mat-sidenav-content class="content">
        <router-outlet></router-outlet>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `
      .topbar {
        position: sticky;
        top: 0;
        z-index: 10;
        background: var(--ink);
        color: #f4f1ea;
        padding: 0 12px;
        box-shadow: 0 1px 0 rgba(0, 0, 0, 0.25);
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-left: 2px;
      }
      .brand-mark {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        background: var(--accent);
        color: #fff;
        display: grid;
        place-items: center;
        font-family: 'Fraunces', serif;
        font-weight: 700;
        font-size: 17px;
      }
      .brand-txt {
        font-family: 'Fraunces', serif;
        font-size: 19px;
        font-weight: 500;
      }
      .brand-txt b {
        font-weight: 700;
      }
      .user-btn {
        color: #f4f1ea;
        display: flex;
        align-items: center;
        gap: 11px;
        height: auto;
        min-height: 52px;
        padding: 6px 14px 6px 8px;
        border-radius: 12px;
        line-height: 1;
      }
      .avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(244, 241, 234, 0.18);
        display: grid;
        place-items: center;
        font-weight: 700;
        font-size: 13px;
        flex: none;
      }
      .user-meta {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        gap: 3px;
        line-height: 1.2;
        margin-right: 2px;
      }
      .user-name {
        font-size: 13.5px;
        font-weight: 600;
      }
      .user-rol {
        font-size: 11px;
        opacity: 0.72;
        text-transform: capitalize;
      }
      .container {
        height: calc(100vh - 64px);
      }
      .sidenav {
        width: 264px;
        background: var(--surface);
        border-right: 1px solid var(--line);
        display: flex;
        flex-direction: column;
        padding: 10px;
      }
      .nav-caption {
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: 0.12em;
        color: var(--muted);
        padding: 14px 12px 8px;
      }
      .nav {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .nav-item {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        border: 0;
        background: transparent;
        cursor: pointer;
        text-decoration: none;
        color: var(--ink-2);
        font: inherit;
        font-weight: 500;
        font-size: 14px;
        padding: 10px 12px;
        border-radius: 10px;
        text-align: left;
      }
      .nav-item:hover {
        background: var(--surface-2);
        color: var(--ink);
      }
      .nav-item .lbl {
        flex: 1;
      }
      .nav-item mat-icon {
        font-size: 20px;
        height: 20px;
        width: 20px;
        color: var(--muted);
      }
      .nav-item.active {
        background: var(--accent-soft);
        color: var(--accent);
      }
      .nav-item.active mat-icon {
        color: var(--accent);
      }
      .chev {
        transition: transform 0.2s ease;
      }
      .chev.open {
        transform: rotate(180deg);
      }
      .subnav {
        display: flex;
        flex-direction: column;
        margin: 2px 0 6px 18px;
        padding-left: 10px;
        border-left: 2px solid var(--line);
      }
      .nav-sub {
        display: flex;
        align-items: center;
        gap: 9px;
        text-decoration: none;
        color: var(--muted);
        font-size: 13px;
        padding: 8px 10px;
        border-radius: 8px;
      }
      .nav-sub:hover {
        background: var(--surface-2);
        color: var(--ink);
      }
      .nav-sub .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--line-2);
      }
      .nav-sub.active-sub {
        color: var(--accent);
        font-weight: 600;
      }
      .nav-sub.active-sub .dot {
        background: var(--accent);
      }
      .nav-foot {
        margin-top: auto;
        padding: 14px 12px;
        font-size: 11px;
        color: var(--muted);
        border-top: 1px solid var(--line);
      }
      .content {
        background: var(--paper);
      }
    `,
  ],
})
export class ShellComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  openGroup = signal<string | null>(null);

  constructor() {
    // Si entramos directo a una sección con submenú, dejarla abierta.
    const grupo = this.items.find((i) => i.children && this.router.url.startsWith(i.path));
    if (grupo) this.openGroup.set(grupo.label);
  }

  toggle(label: string) {
    this.openGroup.update((cur) => (cur === label ? null : label));
  }

  // Click en el padre con submenú: abre el grupo y navega a su hub.
  abrirGrupo(item: NavItem) {
    this.openGroup.set(item.label);
    this.router.navigateByUrl(item.path);
  }

  isGroupActive(item: NavItem): boolean {
    return this.router.url.startsWith(item.path);
  }

  get iniciales(): string {
    const n = (this.auth.nombre ?? '').trim();
    if (!n) return '?';
    const parts = n.split(/[\s@.]+/).filter(Boolean);
    const ini = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
    return ini.toUpperCase() || n[0].toUpperCase();
  }

  items: NavItem[] = [
    { label: 'Dashboard', icon: 'space_dashboard', path: '/dashboard' },
    { label: 'Clientes', icon: 'groups', path: '/clientes' },
    { label: 'Servicios', icon: 'inventory_2', path: '/servicios' },
    { label: 'Calcular tarifa', icon: 'request_quote', path: '/tarifas' },
    { label: 'Encomiendas', icon: 'local_shipping', path: '/encomiendas' },
    { label: 'Documentos', icon: 'description', path: '/documentos' },
    {
      label: 'Inteligencia',
      icon: 'psychology',
      path: '/inteligencia',
      soloAdmin: true,
      children: [
        { label: 'IA · Analizar foto', path: '/inteligencia/ia' },
        { label: 'ML · Predecir retraso', path: '/inteligencia/retraso' },
        { label: 'ML · Agrupar zonas (K-Means)', path: '/inteligencia/zonas' },
      ],
    },
    { label: 'Datasets', icon: 'dataset', path: '/datasets', soloAdmin: true },
    { label: 'Mapa operativo', icon: 'map', path: '/mapa', soloAdmin: true },
    { label: 'Usuarios', icon: 'manage_accounts', path: '/usuarios', soloAdmin: true },
    {
      label: 'Reportes',
      icon: 'bar_chart',
      path: '/reportes',
      soloAdmin: true,
      children: [
        { label: 'Resumen general', path: '/reportes' },
        { label: 'Ingresos (MS1)', path: '/reportes/ingresos' },
        { label: 'Envíos / Operación (MS3)', path: '/reportes/operacion' },
        { label: 'Zonas e incidentes (MS3)', path: '/reportes/zonas' },
        { label: 'Rankings y tops (MS3)', path: '/reportes/rankings' },
      ],
    },
  ];
}
