# Frontend Web — Panel Administrativo (Angular)

> Panel de administración del Sistema de Courier Inteligente (Grupo #11).
> README general del proyecto en la [raíz](../README.md).

| | |
|---|---|
| **Stack** | Angular + Angular Material + Apollo Angular |
| **Despliegue** | Hosting web (estático) |
| **Usuarios** | Operadores, gerente (Administrador) y auditor |
| **Consume** | MS1 (GraphQL), MS2 y MS3 (REST), Metabase (BI) |

---

## 1. Responsabilidad

Interfaz web para la **gestión administrativa** del courier. Cubre todo lo que no es trabajo de campo (eso lo hace la app móvil):

- Gestión de clientes, usuarios, servicios, tarifas y zonas
- Registro y seguimiento de encomiendas
- Gestión documental (subida/descarga)
- IA e incidencias
- Reportes y dashboard BI

---

## 2. Comunicación con el backend

| Destino | Protocolo | Cliente | Qué consume |
|---|---|---|---|
| **MS1 Empresarial** | GraphQL | Apollo Angular | Clientes, usuarios, servicios, tarifas, ingresos, reportes, **login** |
| **MS2 Documental** | REST | HttpClient | Subir/descargar/listar documentos |
| **MS3 Operativo/IA** | REST | HttpClient | Encomiendas, tracking, IA, ML, blockchain |
| **Metabase** | Embed/enlace | iframe | Dashboard BI |

Todo a través del **API Gateway** (un único host de entrada).

---

## 3. Stack técnico

| Tecnología | Uso |
|---|---|
| Angular | Framework SPA |
| Angular Material | Tablas, formularios, botones, diálogos, menús |
| Apollo Angular | Cliente GraphQL (queries/mutations a MS1) |
| HttpClient | Cliente REST (MS2/MS3) |
| RxJS | Manejo asíncrono |
| JWT interceptor | Adjunta el token a cada petición |

---

## 4. Módulos (features)

| Módulo | Uso | Backend |
|---|---|---|
| **Dashboard inicial** | Resumen de envíos, entregas, retrasos, incidencias e ingresos | MS3/MS1 |
| **Auth / Login** | Inicio de sesión, guardado de JWT | MS1 (GraphQL) |
| **Clientes** | Registrar, editar, buscar | MS1 |
| **Usuarios** | Gestión de usuarios internos y roles | MS1 |
| **Servicios y tarifas** | Configurar servicios, calcular tarifas | MS1 |
| **Encomiendas** | Registrar envío, consultar tracking, actualizar estados | MS3 |
| **Documentos** | Subir, consultar, descargar (S3) | MS2 |
| **IA e incidencias** | Enviar imagen para análisis, registrar incidencia | MS3 |
| **Reportes / BI** | Indicadores básicos + enlace al dashboard Metabase | MS1 + Metabase |

---

## 5. Estructura del proyecto

```
src/app/
├── core/
│   ├── auth/                 # AuthService, login, almacenamiento de token
│   ├── guards/               # AuthGuard, RoleGuard
│   └── interceptors/         # JwtInterceptor (adjunta Authorization)
├── shared/                   # componentes y módulo Material reutilizables
├── graphql/                  # queries y mutations (.graphql / gql)
├── services/                 # clientes REST a MS2 y MS3
├── features/
│   ├── dashboard/
│   ├── clientes/
│   ├── usuarios/
│   ├── servicios-tarifas/
│   ├── encomiendas/
│   ├── documentos/
│   ├── ia-incidencias/
│   └── reportes/
└── environments/             # environment.ts / environment.prod.ts
```

---

## 6. Autenticación y roles

- **Login** vía mutation GraphQL a MS1 → recibe **JWT** + `rol`.
- El token se guarda (memoria/`localStorage`) y un **interceptor** lo adjunta como `Authorization: Bearer <token>` en GraphQL y REST.
- **Route guards** restringen vistas según el `rol`:
  - **Administrador:** acceso completo.
  - **Auditor:** lectura de reportes, documentos y bitácoras.
  - **Operador:** gestión operativa (clientes, encomiendas, documentos).
- Token expirado → redirige a login.

> El rol **Cliente** y **Asesor** operan principalmente desde la app móvil; el panel web es para gestión interna.

---

## 7. Variables de entorno (`environment.ts`)

```ts
export const environment = {
  production: false,
  apiGatewayUrl: 'https://<gateway-host>',
  graphqlUrl:   'https://<gateway-host>/graphql',      // MS1
  ms2RestUrl:   'https://<gateway-host>/api/docs',     // MS2
  ms3RestUrl:   'https://<gateway-host>/api/ops',      // MS3
  metabaseUrl:  'https://<metabase-host>/dashboard/1',
};
```

---

## 8. Setup local

```bash
npm install
ng serve            # http://localhost:4200
```

Requisitos: Node 18+, Angular CLI. Backend (MS1/MS2/MS3) corriendo o apuntar a entornos desplegados.

---

## 9. Despliegue

- `ng build --configuration production` → artefactos estáticos en `dist/`.
- Publicar en hosting web (Azure Static Web Apps, Firebase Hosting, S3+CloudFront, etc.).
- Configurar el `environment.prod.ts` con la URL del API Gateway.
