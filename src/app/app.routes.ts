import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/role.guard';
import { ShellComponent } from './features/layout/shell.component';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./features/clientes/clientes.component').then((m) => m.ClientesComponent),
      },
      {
        path: 'servicios',
        loadComponent: () =>
          import('./features/servicios/servicios.component').then((m) => m.ServiciosComponent),
      },
      {
        path: 'tarifas',
        loadComponent: () =>
          import('./features/tarifas/tarifas.component').then((m) => m.TarifasComponent),
      },
      {
        path: 'encomiendas',
        loadComponent: () =>
          import('./features/encomiendas/encomiendas.component').then((m) => m.EncomiendasComponent),
      },
      {
        path: 'documentos',
        loadComponent: () =>
          import('./features/documentos/documentos.component').then((m) => m.DocumentosComponent),
      },
      {
        path: 'auditoria',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/auditoria/auditoria.component').then((m) => m.AuditoriaComponent),
      },
      {
        path: 'inteligencia',
        loadComponent: () =>
          import('./features/inteligencia/inteligencia.component').then((m) => m.InteligenciaComponent),
      },
      {
        path: 'inteligencia/ia',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/inteligencia/ia.component').then((m) => m.IaComponent),
      },
      {
        path: 'inteligencia/retraso',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/inteligencia/retraso.component').then((m) => m.RetrasoComponent),
      },
      {
        path: 'inteligencia/zonas',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/inteligencia/zonas.component').then((m) => m.ZonasComponent),
      },
      {
        path: 'datasets',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/datasets/datasets.component').then((m) => m.DatasetsComponent),
      },
      {
        path: 'mapa',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/mapa/mapa.component').then((m) => m.MapaComponent),
      },
      {
        path: 'usuarios',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
      },
      {
        path: 'reportes',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/reportes/reportes.component').then((m) => m.ReportesComponent),
      },
      {
        path: 'reportes/ingresos',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/reportes/ingresos.component').then((m) => m.ReportesIngresosComponent),
      },
      {
        path: 'reportes/operacion',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/reportes/operacion.component').then((m) => m.ReportesOperacionComponent),
      },
      {
        path: 'reportes/zonas',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/reportes/zonas.component').then((m) => m.ReportesZonasComponent),
      },
      {
        path: 'reportes/rankings',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/reportes/rankings.component').then((m) => m.ReportesRankingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
