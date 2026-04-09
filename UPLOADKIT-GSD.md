# UploadKit.dev — Global System Design (GSD)

## Proyecto

Construir **UploadKit** (uploadkit.dev), un servicio de file uploads como servicio (FUaaS) para desarrolladores, competidor directo de UploadThing. Incluye plataforma SaaS, SDK open-source, documentación, dashboard y landing page.

---

## 1. VISIÓN GENERAL

### 1.1 Qué es UploadKit

UploadKit es una plataforma que permite a los desarrolladores integrar uploads de archivos en sus aplicaciones en minutos. Ofrece:

- **Servicio gestionado**: Almacenamiento en Cloudflare R2, CDN incluido, dashboard de gestión
- **SDK open-source**: Componentes React/Next.js con diseño premium (estilo Apple/Vercel/Supabase)
- **Bring Your Own Storage (BYOS)**: El SDK funciona también con el S3/R2 propio del cliente
- **API REST**: Para cualquier lenguaje/framework

### 1.2 Stack tecnológico

**IMPORTANTE: Usar SIEMPRE las últimas versiones estables de cada dependencia al momento de instalar (`pnpm add package@latest`). No fijar versiones antiguas.**

| Capa | Tecnología |
|------|-----------|
| Monorepo | Turborepo (latest) + pnpm workspaces |
| Web/Landing | Next.js 15 App Router + Tailwind CSS v4 + Motion (framer-motion v11+) |
| Dashboard | Next.js 15 App Router + Tailwind CSS v4 + shadcn/ui (latest) |
| API Backend | Next.js API Routes (o Hono en Cloudflare Workers) |
| Base de datos | MongoDB Atlas + Mongoose ODM (latest) |
| Auth | Auth.js v5 / NextAuth v5 (GitHub + Google + Email magic link) |
| Storage | Cloudflare R2 (principal) + AWS S3 compatible |
| CDN | Cloudflare (gratis, delante de R2) |
| SDK | TypeScript 5.x (latest), publicado en npm como `@uploadkit/react`, `@uploadkit/core` |
| Docs | Fumadocs (latest) con MDX |
| Pagos | Stripe (Checkout + Billing Portal + Webhooks) |
| Emails | Resend + React Email |
| Analytics | Tinybird o PostHog (self-hosted) |
| Runtime | Node.js 22 LTS |
| Despliegue | Vercel (web/api) o Coolify/Docker (self-hosted) |

### 1.3 Estructura del monorepo

```
uploadkit/
├── apps/
│   ├── web/                  # Landing page marketing
│   ├── dashboard/            # Dashboard de usuario (SaaS)
│   ├── docs/                 # Documentación con Fumadocs/MDX
│   └── api/                  # API backend (puede ser parte de dashboard)
├── packages/
│   ├── core/                 # @uploadkit/core - lógica de upload (sin UI)
│   ├── react/                # @uploadkit/react - componentes React
│   ├── next/                 # @uploadkit/next - helpers para Next.js (API route handler)
│   ├── shared/               # @uploadkit/shared - tipos, utils, constantes
│   ├── ui/                   # Componentes internos compartidos (shadcn-based)
│   ├── db/                   # Mongoose models + connection
│   └── config/               # ESLint, TypeScript, Tailwind configs compartidos
├── turbo.json
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## 2. ARQUITECTURA DEL SERVICIO

### 2.1 Flujo de upload (servicio gestionado)

```
Cliente (Browser)
    │
    ▼
1. POST /api/uploadkit/request-upload
   (envía: fileName, fileSize, fileType, apiKey)
    │
    ▼
2. API Server valida:
   - API key válida
   - Tier del usuario (cuota de storage/bandwidth)
   - Tipo de archivo permitido (según config del fileRouter)
   - Tamaño máximo según tier
    │
    ▼
3. Genera presigned URL para R2/S3
   (PUT directo al bucket, expira en 10min)
    │
    ▼
4. Devuelve { presignedUrl, fileKey, cdnUrl } al cliente
    │
    ▼
5. Cliente hace PUT directo al presigned URL
   (upload directo, sin pasar por nuestro server)
    │
    ▼
6. Cliente notifica: POST /api/uploadkit/complete-upload
   (envía: fileKey, metadata)
    │
    ▼
7. API Server:
   - Verifica que el archivo existe en R2
   - Guarda metadata en DB (MongoDB)
   - Ejecuta onUploadComplete callback (webhook al cliente)
   - Actualiza usage del usuario
    │
    ▼
8. Devuelve { url, key, name, size } al cliente
```

### 2.2 Flujo BYOS (Bring Your Own Storage)

Cuando el desarrollador usa su propio S3/R2:

```
1. El dev configura en el SDK sus credenciales S3/R2
2. El SDK genera presigned URLs LOCALMENTE (sin pasar por nuestra API)
3. Upload directo a SU bucket
4. Callback local en su propio servidor
5. No se usa nuestro servicio, 0 coste para nosotros
```

### 2.3 Base de datos — Mongoose Models (MongoDB)

```typescript
// packages/db/src/models/user.ts
import { Schema, model, Types } from 'mongoose';

const userSchema = new Schema({
  name:          { type: String },
  email:         { type: String, required: true, unique: true },
  emailVerified: { type: Date },
  image:         { type: String },
}, { timestamps: true });

export const User = model('User', userSchema);

// packages/db/src/models/account.ts
const accountSchema = new Schema({
  userId:            { type: Types.ObjectId, ref: 'User', required: true, index: true },
  type:              { type: String, required: true },
  provider:          { type: String, required: true },
  providerAccountId: { type: String, required: true },
  refresh_token:     { type: String },
  access_token:      { type: String },
  expires_at:        { type: Number },
  token_type:        { type: String },
  scope:             { type: String },
  id_token:          { type: String },
  session_state:     { type: String },
});
accountSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true });
export const Account = model('Account', accountSchema);

// packages/db/src/models/project.ts
const projectSchema = new Schema({
  name:   { type: String, required: true },
  slug:   { type: String, required: true, unique: true },
  userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });

export const Project = model('Project', projectSchema);

// packages/db/src/models/api-key.ts
const apiKeySchema = new Schema({
  key:        { type: String, required: true, unique: true }, // uk_live_xxxx o uk_test_xxxx
  name:       { type: String, default: 'Default' },
  projectId:  { type: Types.ObjectId, ref: 'Project', required: true, index: true },
  isTest:     { type: Boolean, default: false },
  lastUsedAt: { type: Date },
  revokedAt:  { type: Date },
}, { timestamps: true });

export const ApiKey = model('ApiKey', apiKeySchema);

// packages/db/src/models/file.ts
const FILE_STATUSES = ['UPLOADING', 'UPLOADED', 'FAILED', 'DELETED'] as const;

const fileSchema = new Schema({
  key:        { type: String, required: true, unique: true }, // path en R2: {projectId}/{uuid}/{filename}
  name:       { type: String, required: true },               // nombre original
  size:       { type: Number, required: true },               // bytes
  type:       { type: String, required: true },               // MIME type
  url:        { type: String, required: true },               // CDN URL público
  status:     { type: String, enum: FILE_STATUSES, default: 'UPLOADING' },
  metadata:   { type: Schema.Types.Mixed },                   // metadata custom del dev
  projectId:  { type: Types.ObjectId, ref: 'Project', required: true },
  uploadedBy: { type: String },                               // IP o userId del uploader
  deletedAt:  { type: Date },
}, { timestamps: true });

fileSchema.index({ projectId: 1, createdAt: -1 });
fileSchema.index({ status: 1 });
export const File = model('File', fileSchema);

// packages/db/src/models/file-router.ts
const fileRouterSchema = new Schema({
  slug:         { type: String, required: true },   // "imageUploader", "documentUploader"
  projectId:    { type: Types.ObjectId, ref: 'Project', required: true },
  maxFileSize:  { type: Number, default: 4194304 }, // 4MB default
  maxFileCount: { type: Number, default: 1 },
  allowedTypes: [{ type: String }],                 // ["image/png", "image/jpeg"]
}, { timestamps: true });

fileRouterSchema.index({ projectId: 1, slug: 1 }, { unique: true });
export const FileRouter = model('FileRouter', fileRouterSchema);

// packages/db/src/models/subscription.ts
const TIERS = ['FREE', 'PRO', 'TEAM', 'ENTERPRISE'] as const;
const SUB_STATUSES = ['ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING'] as const;

const subscriptionSchema = new Schema({
  userId:               { type: Types.ObjectId, ref: 'User', required: true, unique: true },
  stripeCustomerId:     { type: String, required: true, unique: true },
  stripeSubscriptionId: { type: String, unique: true, sparse: true },
  stripePriceId:        { type: String },
  tier:                 { type: String, enum: TIERS, default: 'FREE' },
  status:               { type: String, enum: SUB_STATUSES, default: 'ACTIVE' },
  currentPeriodStart:   { type: Date },
  currentPeriodEnd:     { type: Date },
  cancelAtPeriodEnd:    { type: Boolean, default: false },
}, { timestamps: true });

export const Subscription = model('Subscription', subscriptionSchema);

// packages/db/src/models/usage-record.ts
const usageRecordSchema = new Schema({
  userId:      { type: Types.ObjectId, ref: 'User', required: true },
  period:      { type: String, required: true },   // "2025-01" formato YYYY-MM
  storageUsed: { type: Number, default: 0 },       // bytes (usar Long si >2GB)
  bandwidth:   { type: Number, default: 0 },       // bytes
  uploads:     { type: Number, default: 0 },       // count
}, { timestamps: true });

usageRecordSchema.index({ userId: 1, period: 1 }, { unique: true });
export const UsageRecord = model('UsageRecord', usageRecordSchema);

// packages/db/src/connection.ts
import mongoose from 'mongoose';

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

export async function connectDB() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI!);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
```

### 2.4 API Endpoints

```
# Auth
POST   /api/auth/[...nextauth]     # NextAuth handlers

# Upload flow
POST   /api/v1/upload/request      # Solicitar presigned URL
POST   /api/v1/upload/complete     # Confirmar upload completado
DELETE /api/v1/files/:fileKey       # Eliminar archivo

# Files
GET    /api/v1/files               # Listar archivos (paginado)
GET    /api/v1/files/:fileKey       # Obtener info de un archivo
PATCH  /api/v1/files/:fileKey       # Actualizar metadata

# Projects
GET    /api/v1/projects             # Listar proyectos
POST   /api/v1/projects             # Crear proyecto
PATCH  /api/v1/projects/:id         # Editar proyecto
DELETE /api/v1/projects/:id         # Eliminar proyecto

# API Keys
GET    /api/v1/projects/:id/keys    # Listar API keys
POST   /api/v1/projects/:id/keys    # Crear API key
DELETE /api/v1/keys/:keyId          # Revocar API key

# Usage & Billing
GET    /api/v1/usage                # Usage actual del período
GET    /api/v1/usage/history        # Histórico de usage
POST   /api/v1/billing/checkout     # Crear Stripe checkout session
POST   /api/v1/billing/portal       # Abrir Stripe billing portal
POST   /api/v1/webhooks/stripe      # Stripe webhook handler

# File Router config (dashboard)
GET    /api/v1/projects/:id/routers
POST   /api/v1/projects/:id/routers
PATCH  /api/v1/routers/:routerId
DELETE /api/v1/routers/:routerId
```

---

## 3. SDK — PACKAGES

### 3.1 `@uploadkit/core`

Paquete base sin dependencias de React. Lógica pura TypeScript.

```typescript
// Ejemplo de API pública del core
import { createUploadKit } from '@uploadkit/core';

const uploadkit = createUploadKit({
  // Modo 1: Usar servicio gestionado UploadKit
  apiKey: 'uk_live_xxxxx',

  // Modo 2: BYOS - Bring Your Own Storage
  // provider: 's3',
  // credentials: {
  //   accessKeyId: '...',
  //   secretAccessKey: '...',
  //   region: 'us-east-1',
  //   bucket: 'my-bucket',
  //   endpoint: 'https://xxx.r2.cloudflarestorage.com', // opcional, para R2
  // },
});

// Upload programático
const result = await uploadkit.upload({
  file: fileObject,
  route: 'imageUploader', // file router slug
  metadata: { userId: '123' },
  onProgress: (progress) => console.log(`${progress}%`),
});
// result = { url, key, name, size, type }

// Listar archivos
const files = await uploadkit.listFiles({ limit: 20, cursor: '...' });

// Eliminar
await uploadkit.deleteFile('file-key');
```

**Funcionalidades del core:**
- Presigned URL request y upload directo
- Multipart upload para archivos grandes (>10MB)
- Retry automático con exponential backoff
- Progress tracking
- Abort controller para cancelar uploads
- Validación client-side (tipo, tamaño) antes de enviar
- BYOS: generar presigned URLs localmente con @aws-sdk/s3-request-presigner

### 3.2 `@uploadkit/react`

Componentes React con diseño premium. **Estilo visual minimalista Apple/Vercel/Supabase.**

```typescript
// Componentes exportados:
export {
  UploadButton,        // Botón simple que abre file picker
  UploadDropzone,      // Zona drag & drop con preview
  UploadModal,         // Modal overlay con dropzone
  UploadInline,        // Inline upload con progress integrado
  FileList,            // Lista de archivos subidos con acciones
  FilePreview,         // Preview de imagen/video/doc
  useUploadKit,        // Hook para control programático
  UploadKitProvider,   // Context provider
} from '@uploadkit/react';
```

**Diseño de componentes — Directrices:**

1. **UploadButton**
   - Botón minimalista con icono de upload
   - Estados: idle → hover → uploading (spinner + %) → success (check) → error
   - Variantes: `default`, `outline`, `ghost`, `destructive`
   - Tamaños: `sm`, `md`, `lg`
   - Animaciones con Framer Motion sutiles
   - Personalizable con className (Tailwind merge)

2. **UploadDropzone**
   - Borde dashed con esquinas redondeadas (border-radius: 12px)
   - Icono cloud-upload centrado, texto "Drag & drop or click to browse"
   - Estado drag-over: fondo azul/indigo claro con borde sólido
   - Preview de archivos inline (thumbnails para imágenes)
   - Barra de progreso integrada por archivo
   - Multi-file con lista debajo
   - Dark mode automático
   - Responsive

3. **UploadModal**
   - Overlay con backdrop blur
   - Contenido = UploadDropzone dentro de un modal
   - Animación de entrada/salida (scale + opacity)
   - Cerrar con ESC o click fuera

4. **FilePreview**
   - Imágenes: thumbnail con zoom on click (lightbox)
   - Videos: player inline con poster
   - PDFs: primera página como imagen
   - Otros: icono del tipo + metadata

**Paleta de colores por defecto (CSS variables, overrideable):**
```css
:root {
  --uk-primary: #0070f3;        /* Vercel blue */
  --uk-primary-hover: #005bb5;
  --uk-bg: #ffffff;
  --uk-bg-secondary: #fafafa;
  --uk-border: #eaeaea;
  --uk-text: #171717;
  --uk-text-secondary: #666666;
  --uk-success: #00c853;
  --uk-error: #ef4444;
  --uk-radius: 12px;
}

[data-theme="dark"] {
  --uk-bg: #0a0a0a;
  --uk-bg-secondary: #1a1a1a;
  --uk-border: #333333;
  --uk-text: #ededed;
  --uk-text-secondary: #888888;
}
```

**Tipografía:** Inter (o system font stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', etc.)

**Ejemplo de uso React:**
```tsx
import { UploadDropzone, UploadKitProvider } from '@uploadkit/react';
import '@uploadkit/react/styles.css';

// En layout/provider
<UploadKitProvider apiKey="uk_live_xxx">
  <App />
</UploadKitProvider>

// En cualquier componente
<UploadDropzone
  route="imageUploader"
  maxFiles={5}
  maxSize="10MB"
  accept={['image/*']}
  onUploadComplete={(files) => {
    console.log('Uploaded:', files);
  }}
  onUploadError={(error) => {
    console.error('Error:', error);
  }}
  appearance={{
    container: 'border-2 border-dashed rounded-xl p-8',
    button: 'bg-blue-600 text-white rounded-lg px-4 py-2',
  }}
/>
```

### 3.3 `@uploadkit/next`

Helpers específicos para Next.js App Router.

```typescript
// app/api/uploadkit/route.ts
import { createUploadKitHandler } from '@uploadkit/next';
import { z } from 'zod';

const fileRouter = {
  imageUploader: {
    maxFileSize: '4MB',
    maxFileCount: 4,
    allowedTypes: ['image/*'],
    middleware: async ({ req }) => {
      // Auth check
      const user = await getUser(req);
      if (!user) throw new Error('Unauthorized');
      return { userId: user.id };
    },
    onUploadComplete: async ({ file, metadata }) => {
      console.log('Upload complete:', file.url);
      // Guardar en tu DB, etc.
      return { uploadedBy: metadata.userId };
    },
  },
  documentUploader: {
    maxFileSize: '16MB',
    maxFileCount: 1,
    allowedTypes: ['application/pdf', 'application/msword'],
    middleware: async ({ req }) => {
      const user = await getUser(req);
      if (!user) throw new Error('Unauthorized');
      return { userId: user.id };
    },
    onUploadComplete: async ({ file, metadata }) => {
      return { url: file.url };
    },
  },
} satisfies FileRouter;

export type AppFileRouter = typeof fileRouter;
export const { GET, POST } = createUploadKitHandler({ router: fileRouter });
```

```typescript
// En el cliente con tipado end-to-end
import { generateReactHelpers } from '@uploadkit/react';
import type { AppFileRouter } from '@/app/api/uploadkit/route';

export const { useUploadKit, UploadButton, UploadDropzone } =
  generateReactHelpers<AppFileRouter>();

// Ahora los componentes tienen autocomplete de los routes:
<UploadButton route="imageUploader" />  // ✅ tipado
<UploadButton route="foobar" />         // ❌ error TypeScript
```

---

## 4. DASHBOARD (apps/dashboard)

### 4.1 Páginas y layout

```
/login                          # Login con GitHub/Google/Magic Link
/register                       # Registro (mismo form, toggle)
/dashboard                      # Overview: usage, archivos recientes, quick stats
/dashboard/projects              # Lista de proyectos
/dashboard/projects/[slug]       # Detalle proyecto
/dashboard/projects/[slug]/files # File browser con tabla + filtros
/dashboard/projects/[slug]/keys  # API Keys (crear, revocar, copiar)
/dashboard/projects/[slug]/routes # File routers configurados
/dashboard/projects/[slug]/settings # Config del proyecto
/dashboard/projects/[slug]/logs  # Upload logs en tiempo real
/dashboard/usage                 # Usage detallado con gráficos
/dashboard/billing               # Plan actual, upgrade, invoices
/dashboard/settings              # Perfil, notificaciones
```

### 4.2 Diseño del Dashboard

**Estilo visual:** Inspirado en Vercel/Linear/Supabase dashboard.

- **Sidebar izquierda** (colapsable): Logo, navegación principal, selector de proyecto, plan badge
- **Header superior**: Breadcrumbs, search (cmd+k), notificaciones, avatar
- **Contenido**: Cards con métricas, tablas con shadcn DataTable, gráficos con Recharts
- **Dark mode** por defecto con toggle

**Componentes clave del dashboard:**

1. **Overview page**: 4 metric cards (Storage usado, Bandwidth, Uploads hoy, Archivos totales) + gráfico de uploads últimos 30 días + tabla archivos recientes
2. **File browser**: DataTable con columnas (Preview | Nombre | Tamaño | Tipo | Fecha | Acciones). Filtros por tipo, fecha, tamaño. Búsqueda. Paginación. Bulk delete.
3. **API Keys page**: Tabla de keys con máscara (uk_live_xxx...xxx). Botón copiar. Crear nueva. Revocar con confirmación.
4. **Usage page**: Barras de progreso mostrando % del límite del tier. Gráfico histórico. Breakdown por proyecto.
5. **Billing page**: Card con plan actual y features. Botón upgrade. Enlace a Stripe billing portal. Historial de invoices.

---

## 5. LANDING PAGE (apps/web)

### 5.1 Estructura de páginas

```
/                    # Homepage
/pricing             # Tabla de precios
/docs                # Redirige a docs app
/blog                # Blog con MDX (opcional v2)
/changelog           # Changelog (opcional v2)
/about               # About us (opcional v2)
```

### 5.2 Homepage — Secciones

1. **Hero**
   - Headline: "File uploads for developers. Done right."
   - Subheadline: "Add beautiful, type-safe file uploads to your app in minutes. Free tier included."
   - CTA: "Get started free" + "View docs"
   - Code snippet animado mostrando integración en 3 líneas
   - Badge: "5GB free forever"

2. **Code Demo interactivo**
   - Tabs: "Next.js" | "React" | "API"
   - Código con syntax highlighting (Shiki)
   - Preview en vivo del componente al lado del código

3. **Features grid** (3x2 o 2x3)
   - ☁️ "Managed storage" — Cloudflare R2, global CDN, zero egress fees
   - 🔌 "Bring Your Own Storage" — Works with your S3/R2 bucket
   - 🎨 "Beautiful components" — Drop-in React components, dark mode, fully customizable
   - 🔒 "Type-safe" — End-to-end TypeScript, file router pattern
   - ⚡ "Direct uploads" — Presigned URLs, no server bottleneck, multipart for large files
   - 📊 "Dashboard" — Monitor uploads, usage, billing in real-time

4. **Comparativa con UploadThing**
   - Tabla comparativa sutil (sin nombrarlos directamente, solo "Others")
   - Destacar: BYOS, free tier más generoso, open-source SDK, sin vendor lock-in

5. **Component showcase**
   - Demos interactivos de UploadButton, UploadDropzone, UploadModal
   - Toggle dark/light mode
   - Personalización en vivo (cambiar colores, tamaños)

6. **Pricing preview**
   - 3 cards (Free / Pro / Team)
   - CTA a /pricing

7. **Testimonials/Social proof** (placeholder para v2)

8. **Footer**
   - Links: Docs, GitHub, Twitter, Discord, Status
   - "Built with ❤️ by [tu marca]"

### 5.3 Página de Pricing

Tabla de precios con toggle monthly/yearly (20% descuento anual):

| Feature | Free | Pro ($15/mo) | Team ($35/mo) | Enterprise |
|---------|------|-------------|---------------|------------|
| Storage | 5 GB | 50 GB | 200 GB | Custom |
| Bandwidth/mo | 10 GB | 100 GB | 500 GB | Custom |
| Max file size | 16 MB | 64 MB | 256 MB | Custom |
| Uploads/mo | 1,000 | 10,000 | 50,000 | Unlimited |
| Proyectos | 1 | 5 | 20 | Unlimited |
| File routes | 3 | 10 | Unlimited | Unlimited |
| Custom domain CDN | ❌ | ✅ | ✅ | ✅ |
| BYOS support | ✅ | ✅ | ✅ | ✅ |
| API access | ✅ | ✅ | ✅ | ✅ |
| Analytics | Basic | Advanced | Advanced | Custom |
| Support | Community | Email | Priority | Dedicated |
| Webhooks | ❌ | ✅ | ✅ | ✅ |
| Team members | 1 | 1 | 5 | Custom |
| SLA | ❌ | ❌ | 99.9% | 99.99% |
| SOC 2 | ❌ | ❌ | ❌ | ✅ |

**Overage pricing:**
- Storage extra: $0.02/GB/mo
- Bandwidth extra: $0.01/GB (gracias a R2 sin egress fees)
- Uploads extra: $0.001/upload

---

## 6. DOCUMENTACIÓN (apps/docs)

### 6.1 Framework

Usar **Fumadocs** (fumadocs.vercel.app) — framework de docs para Next.js con MDX, search integrado, y diseño moderno.

### 6.2 Estructura de contenido

```
docs/
├── introduction.mdx
├── getting-started/
│   ├── quickstart.mdx          # 5 min setup
│   ├── nextjs.mdx              # Setup con Next.js
│   ├── react.mdx               # Setup con React (Vite, CRA)
│   └── api-only.mdx            # Solo API REST
├── core-concepts/
│   ├── file-routes.mdx         # Qué son y cómo funcionan
│   ├── presigned-urls.mdx      # Cómo funciona el upload
│   ├── byos.mdx                # Bring Your Own Storage
│   └── security.mdx            # API keys, validación, limits
├── sdk/
│   ├── core/
│   │   ├── installation.mdx
│   │   ├── configuration.mdx
│   │   ├── upload.mdx
│   │   ├── delete.mdx
│   │   └── api-reference.mdx
│   ├── react/
│   │   ├── installation.mdx
│   │   ├── upload-button.mdx
│   │   ├── upload-dropzone.mdx
│   │   ├── upload-modal.mdx
│   │   ├── file-list.mdx
│   │   ├── file-preview.mdx
│   │   ├── use-uploadkit.mdx
│   │   ├── theming.mdx
│   │   └── api-reference.mdx
│   └── next/
│       ├── installation.mdx
│       ├── file-router.mdx
│       ├── middleware.mdx
│       ├── type-safety.mdx
│       └── api-reference.mdx
├── dashboard/
│   ├── overview.mdx
│   ├── projects.mdx
│   ├── files.mdx
│   ├── api-keys.mdx
│   └── billing.mdx
├── api-reference/
│   ├── rest-api.mdx
│   ├── authentication.mdx
│   ├── upload.mdx
│   ├── files.mdx
│   ├── projects.mdx
│   ├── webhooks.mdx
│   └── errors.mdx
├── guides/
│   ├── image-upload.mdx
│   ├── avatar-upload.mdx
│   ├── document-upload.mdx
│   ├── multipart-upload.mdx
│   ├── custom-styling.mdx
│   ├── migration-from-uploadthing.mdx
│   └── self-hosted.mdx
└── changelog.mdx
```

### 6.3 Quickstart (contenido del doc)

El quickstart debe mostrar que en menos de 2 minutos puedes tener uploads funcionando:

```bash
# 1. Instalar
pnpm add @uploadkit/next @uploadkit/react

# 2. Crear file router (app/api/uploadkit/route.ts) — 10 líneas
# 3. Añadir provider — 3 líneas
# 4. Usar componente — 1 línea: <UploadDropzone route="imageUploader" />
# 5. Profit
```

---

## 7. INFRAESTRUCTURA — Cloudflare R2

### 7.1 Configuración R2

```
Bucket name: uploadkit-prod
Region: auto (Cloudflare elige el más cercano)
Custom domain: cdn.uploadkit.dev (CNAME al bucket)

Estructura de keys en R2:
{projectId}/{fileRouterId}/{uuid}/{originalFilename}
Ejemplo: proj_abc123/imageUploader/550e8400-e29b/photo.jpg
```

### 7.2 Presigned URLs

Usar `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` ya que R2 es compatible con S3 API.

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function generatePresignedUrl(key: string, contentType: string, maxSize: number) {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: key,
    ContentType: contentType,
    ContentLength: maxSize, // limitar tamaño
  });

  return getSignedUrl(r2, command, { expiresIn: 600 }); // 10 min
}
```

### 7.3 CDN

- Configurar custom domain `cdn.uploadkit.dev` apuntando al bucket R2
- Cloudflare cache automático, zero config
- Cache rules: immutable para archivos subidos (nunca cambian de key)
- Opcional: transformaciones de imagen con Cloudflare Images ($5/mo)

---

## 8. PAGOS — STRIPE

### 8.1 Productos en Stripe

Crear en Stripe Dashboard (o via API):

```
Products:
  - UploadKit Pro     → $15/mo or $144/yr
  - UploadKit Team    → $35/mo or $336/yr
  - UploadKit Enterprise → custom (contact sales)

Metered add-ons (usage-based):
  - Extra Storage     → $0.02/GB/mo
  - Extra Bandwidth   → $0.01/GB
  - Extra Uploads     → $0.001/upload
```

### 8.2 Webhook flow

```
Stripe webhook events a manejar:
  - checkout.session.completed → Crear/actualizar subscription
  - customer.subscription.updated → Cambio de plan
  - customer.subscription.deleted → Cancelación
  - invoice.paid → Registrar pago
  - invoice.payment_failed → Marcar como past_due, enviar email
```

---

## 9. PLAN DE EJECUCIÓN — FASES

### FASE 1: Foundation (Semana 1-2)
- [ ] Setup monorepo Turborepo + pnpm
- [ ] Configurar packages/config (ESLint, TS, Tailwind)
- [ ] Setup MongoDB Atlas + Mongoose models + connection helper
- [ ] Setup Auth.js v5 en dashboard app
- [ ] Crear bucket R2 + custom domain CDN
- [ ] Implementar presigned URL generation
- [ ] API routes básicas: request-upload, complete-upload, delete
- [ ] Tests unitarios de la API

### FASE 2: SDK Core (Semana 3)
- [ ] `@uploadkit/core`: upload, multipart, progress, retry, abort
- [ ] `@uploadkit/core`: modo BYOS con credenciales S3/R2 propias
- [ ] `@uploadkit/next`: createUploadKitHandler, fileRouter pattern
- [ ] `@uploadkit/next`: tipado end-to-end con generics
- [ ] Tests del SDK

### FASE 3: React Components (Semana 4)
- [ ] `@uploadkit/react`: UploadKitProvider + useUploadKit hook
- [ ] `@uploadkit/react`: UploadButton con todos los estados
- [ ] `@uploadkit/react`: UploadDropzone con drag&drop + previews
- [ ] `@uploadkit/react`: UploadModal
- [ ] `@uploadkit/react`: FileList + FilePreview
- [ ] `@uploadkit/react`: Sistema de theming con CSS variables
- [ ] `@uploadkit/react`: Dark mode
- [ ] `@uploadkit/react`: styles.css bundle
- [ ] Storybook o playground para testear componentes
- [ ] Publicar packages en npm (alpha)

### FASE 4: Dashboard (Semana 5-6)
- [ ] Layout: sidebar + header + responsive
- [ ] Overview page con métricas
- [ ] Projects CRUD
- [ ] File browser con DataTable
- [ ] API Keys management
- [ ] File Routes config UI
- [ ] Upload logs en tiempo real
- [ ] Usage page con gráficos (Recharts)
- [ ] Billing page + Stripe integration
- [ ] Settings (perfil, delete account)
- [ ] Command palette (cmd+k)

### FASE 5: Landing + Docs (Semana 7)
- [ ] Landing: Hero + features + code demo + pricing
- [ ] Landing: Animaciones Framer Motion
- [ ] Landing: Responsive + dark mode
- [ ] Landing: SEO (metadata, OG images)
- [ ] Docs: Setup Fumadocs
- [ ] Docs: Quickstart guide
- [ ] Docs: SDK reference (core, react, next)
- [ ] Docs: API reference
- [ ] Docs: Guides (image upload, BYOS, migration)
- [ ] Docs: Search funcional

### FASE 6: Polish + Launch (Semana 8)
- [ ] Rate limiting (Upstash Redis)
- [ ] Email transaccional (Resend): welcome, usage alerts, invoice
- [ ] Error handling robusto en toda la API
- [ ] Monitoring (Sentry)
- [ ] E2E tests (Playwright)
- [ ] Publicar SDK en npm (v1.0)
- [ ] Deploy landing + dashboard + docs
- [ ] Product Hunt prep
- [ ] README del repo con badges

---

## 10. ENV VARIABLES

```env
# Database (MongoDB Atlas)
MONGODB_URI="mongodb+srv://..."

# Auth.js v5
AUTH_URL="https://dashboard.uploadkit.dev"
AUTH_SECRET="..."
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Cloudflare R2
R2_ENDPOINT="https://xxx.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET="uploadkit-prod"
R2_PUBLIC_URL="https://cdn.uploadkit.dev"

# Stripe
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_TEAM_PRICE_ID="price_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_..."

# Resend
RESEND_API_KEY="re_..."

# Rate Limiting
UPSTASH_REDIS_URL="..."
UPSTASH_REDIS_TOKEN="..."

# Misc
NEXT_PUBLIC_APP_URL="https://uploadkit.dev"
NEXT_PUBLIC_DASHBOARD_URL="https://dashboard.uploadkit.dev"
NEXT_PUBLIC_DOCS_URL="https://docs.uploadkit.dev"
NEXT_PUBLIC_CDN_URL="https://cdn.uploadkit.dev"
```

---

## 11. NOTAS PARA CLAUDE CODE

1. **Prioridad de diseño**: Los componentes React del SDK deben verse PREMIUM. Referencia visual: componentes de Vercel, Supabase UI, Linear. Nada de diseño genérico.
2. **TypeScript strict**: Usar `strict: true` en todos los packages. Zero `any`.
3. **Naming**: API keys prefijadas con `uk_live_` y `uk_test_`.
4. **Error messages**: Descriptivos y con sugerencias de fix, estilo Stripe.
5. **Performance**: Lazy loading en dashboard. Componentes React del SDK deben ser tree-shakeable.
6. **Accesibilidad**: WCAG 2.1 AA en todos los componentes.
7. **Testing**: Vitest para unit tests, Playwright para E2E.
8. **Git**: Conventional commits. Changesets para versioning del SDK.
9. **CI/CD**: GitHub Actions para lint, test, build, publish npm.
10. **Empezar fase a fase**: No intentar todo a la vez. Seguir el orden de las fases.
11. **Versiones**: SIEMPRE instalar la última versión estable de cada paquete (`pnpm add package@latest`). No hardcodear versiones viejas. Verificar compatibilidad entre dependencias.
12. **MongoDB**: Usar Mongoose como ODM. No usar Prisma. La conexión debe reutilizarse (cached connection pattern para serverless/Next.js).
