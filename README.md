# Frontend Web — Panel Administrativo (Angular)

Panel administrativo del **Sistema de Courier Inteligente** (Grupo #11).
Angular 18 (standalone) + Angular Material + Apollo (GraphQL).

> Documento de contexto/arquitectura: [`contextoFrontendWeb.md`](contextoFrontendWeb.md).
> Contexto general del proyecto: [`../README.md`](../README.md).

---

## Requisitos

- Node.js 18+ (probado en 22)
- **MS1 corriendo** en `http://localhost:3001/graphql` (ver `../ms1-empresarial`)

## Puesta en marcha

```bash
npm install
npm start          # http://localhost:4200
```

> El MS1 ya tiene `CORS_ORIGIN=http://localhost:4200`, así que el panel se conecta directo.
> Login inicial (seed del MS1): **admin@courier.com** / **admin123**.

---

## Qué funciona hoy (contra MS1)

| Vista | Backend | Estado |
|---|---|---|
| Login | MS1 GraphQL | ✅ |
| Dashboard | — | ✅ |
| Clientes (listar / registrar) | MS1 | ✅ |
| Servicios (listar / crear / desactivar) | MS1 | ✅ |
| Calcular tarifa | MS1 | ✅ |
| Usuarios (listar / crear) — solo ADMIN | MS1 | ✅ |
| Reportes (ingresos) + embed Metabase — solo ADMIN | MS1 + Metabase | ✅ |

Servicios REST **listos** para cuando MS2/MS3 estén desplegados:
`src/app/services/ms2-documentos.service.ts`, `ms3-encomiendas.service.ts`.

---

## Arquitectura interna

```
src/app/
├── core/
│   ├── auth/        (auth.service, auth.guard, role.guard)
│   ├── interceptors/jwt.interceptor.ts   # adjunta el JWT a GraphQL y REST
│   └── graphql/graphql.provider.ts       # Apollo → MS1
├── features/
│   ├── auth/login.component.ts
│   ├── layout/shell.component.ts         # toolbar + sidenav + menú por rol
│   ├── dashboard/  clientes/  servicios/
│   ├── tarifas/  usuarios/  reportes/
└── services/        (ms2-documentos, ms3-encomiendas)  # REST stubs
```

- **Auth:** login por GraphQL a MS1 → guarda JWT en `localStorage` → interceptor lo adjunta.
- **Guards:** `authGuard` (sesión) y `adminGuard` (usuarios/reportes solo ADMIN).
- **Apollo:** configurado en `graphql.provider.ts`, apunta a `environment.graphqlUrl`.

## Configuración

`src/environments/environment.ts` (dev) y `environment.prod.ts` (prod, vía API Gateway).

```ts
graphqlUrl: 'http://localhost:3001/graphql', // MS1
ms2RestUrl: 'http://localhost:8080/api/docs', // MS2
ms3RestUrl: 'http://localhost:8000/api/ops',  // MS3
metabaseUrl: '',                              // dashboard BI (embed)
```

## Build de producción

```bash
npm run build      # genera dist/frontend-web (estático)
```
Publicar en hosting web (Azure Static Web Apps, Firebase Hosting, S3+CloudFront).
Configurar `environment.prod.ts` con la URL del API Gateway.
