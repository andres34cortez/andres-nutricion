# Nutrición Andrés

Para retomar con otra IA o después de perder el contexto, leer [CONTINUAR_CON_OTRA_IA.md](CONTINUAR_CON_OTRA_IA.md) y [EXECUTION_PLAN.md](EXECUTION_PLAN.md).

Aplicación mobile-first/PWA para registrar alimentación, macros, peso y actividad; visualizar tendencias; y analizar fotografías de comidas con confirmación humana. La IA detecta, la persona confirma y el motor nutricional calcula.

## Arquitectura

- Next.js 16, App Router, React 19 y TypeScript.
- PostgreSQL + Prisma. Para Vercel se recomienda Neon (free tier y conexión compatible con Prisma).
- Auth.js con credenciales y sesiones JWT; cada registro conserva `userId` y se valida ownership en el servidor.
- Zod para entradas HTTP y respuestas estructuradas de IA.
- Recharts para tendencias; funciones puras y testeadas para nutrición y reportes.
- `AIProvider` desacoplado con implementación inicial `GeminiAIProvider`. La clave nunca llega al navegador.
- PWA con manifest, icono, safe areas de iOS y service worker.

Con `APP_DEMO_MODE=false`, la interfaz exige sesión y persiste los datos por usuario en PostgreSQL. El almacenamiento local del navegador se usa solo en modo demostración. Antes de un uso remoto hay que configurar hosting, base de datos y autenticación de producción.

## Modelo de datos

`User` posee `Profile`, objetivos históricos `NutritionGoal`, `WeightEntry`, `Food`, `Meal`/`MealItem`, `Recipe`/`RecipeIngredient`, `Activity`, `Routine`/`RoutineDay` y `AIAnalysis`. Los objetivos usan `validFrom`/`validUntil`, por lo que un cambio no altera reportes pasados. Los valores nutricionales de un ítem se capturan al registrar la comida para preservar el historial ante futuras ediciones del catálogo.

## Requisitos e instalación

- Node.js 22+
- pnpm 10+
- PostgreSQL o Docker Desktop

```bash
pnpm install
cp .env.example .env.local
docker compose up -d postgres
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Abrir `http://localhost:3000`. El seed crea `andres@example.com`; defina una contraseña segura en `SEED_USER_PASSWORD` antes de ejecutarlo.

## Variables de entorno

Consulte `.env.example`. Son obligatorias en producción:

- `DATABASE_URL`: conexión PostgreSQL con SSL.
- `APP_URL`: origen público confiable usado en metadata social.
- `AUTH_SECRET`: secreto aleatorio (`openssl rand -base64 32`).
- `AI_PROVIDER`: actualmente `gemini`.
- `GEMINI_API_KEY`: solo servidor.
- `GEMINI_MODEL`: por defecto `gemini-3.8-flash`.
- `GEMINI_FALLBACK_MODELS`: lista separada por comas; por defecto `gemini-3.6-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite`. Se recorren únicamente ante errores temporales o alta demanda.
- `APP_TIMEZONE`: por defecto `America/Argentina/San_Juan`.
- `APP_DEMO_MODE`: `true` permite explorar datos locales; use `false` en producción para exigir inicio de sesión.

Nunca use `NEXT_PUBLIC_GEMINI_API_KEY`.

## Gemini

1. Abrir [Google AI Studio](https://aistudio.google.com/apikey).
2. Crear una API key.
3. Copiar `.env.example` a `.env.local`.
4. Agregar `GEMINI_API_KEY=...`, `AI_PROVIDER=gemini` y, opcionalmente, `GEMINI_MODEL=...`.
5. Reiniciar la aplicación.

El selector acepta JPEG, PNG, WebP, HEIC o HEIF de hasta 20 MB. Antes de enviarla, el navegador muestra una vista previa y reduce la foto en memoria a un JPEG de hasta 1600 px y menos de 3 MB, manteniendo la solicitud por debajo del límite de Vercel. La imagen se envía a Gemini en memoria, la respuesta se marca `no-store` y la imagen nunca se persiste en base de datos, disco, logs ni historial. Solo se guardan fecha, hora, categoría y valores nutricionales confirmados. El resultado JSON se valida con Zod. Si Gemini falla, la foto permanece lista para reintentar; la app exige revisión antes de guardar y el registro manual sigue disponible.

## Base de datos y Prisma

Para desarrollo local, el repositorio incluye PostgreSQL 16 mediante Docker en el puerto `5433`, evitando conflictos con instalaciones nativas:

```bash
docker compose up -d postgres
```

Los datos quedan en el volumen `nutricion_andres_postgres`. Luego prepare el esquema y los datos iniciales:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Para producción, ejecute `pnpm prisma migrate deploy` durante el despliegue. Nunca modifique un objetivo vigente en retrospectiva: cierre `validUntil` y cree un nuevo registro.

## Calidad

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:records
pnpm test:browser
pnpm build
```

Los tests cubren porciones, recetas, totales, promedios con cobertura, tendencia de peso, media móvil, objetivo histórico, recomendación inicial editable de calorías/macros, límites de timezone y validación de IA.

`test:records` y `test:browser` requieren el servidor local en `http://localhost:3000`, PostgreSQL y las variables locales en `.env`. Crean cuentas temporales con identificadores aleatorios y las eliminan al finalizar; no usan los datos del usuario admin. `test:browser` usa Chrome instalado en un contexto aislado de 390 × 844, sin acceder a las sesiones personales del navegador. No representa una prueba en iPhone real. Las pruebas del escáner en Vitest simulan Gemini, sin enviar fotografías ni consumir su API.

### Revisión de comidas y fotos

- Corregí los ingredientes detectados y confirmá cantidad y unidad.
- Elegí una referencia de tu catálogo con la misma unidad, o completá los cuatro valores nutricionales manualmente. Un dato faltante no equivale a cero.
- Al cambiar cantidad, los macros se recalculan proporcionalmente desde una base estable. Si cambiás unidad, se vacían para evitar conversiones incorrectas.
- Todos los valores en cero requieren confirmación explícita (por ejemplo, agua); también se valida en el endpoint de registros.
- La aplicación no almacena fotos. Solo persiste los datos confirmados. Una respuesta incierta del servidor no garantiza que no haya guardado: revisá el historial antes de repetir una escritura.

El avance y las verificaciones pendientes están en `EXECUTION_PLAN.md`. Google OAuth y Vercel ya están configurados; el PDF y el modo entrenamiento siguen pendientes.

## Despliegue en Vercel

1. Subir el repositorio a GitHub y crear un proyecto en Vercel.
2. Crear una base Neon desde Vercel Marketplace o Neon y copiar la URL con SSL.
3. Configurar todas las variables de `.env.example` en Production/Preview.
4. Ejecutar migraciones contra producción con `pnpm prisma migrate deploy`.
5. Desplegar y comprobar inicio de sesión, escritura en DB y `/manifest.webmanifest`.
6. Añadir `GEMINI_API_KEY` solamente si se habilitará el escáner.

## Instalar en iPhone

Abrir la URL desplegada en Safari, tocar **Compartir**, elegir **Agregar a pantalla de inicio** y confirmar **Andrés**. La app usa modo standalone y respeta safe areas. iOS puede requerir abrirla una vez después de una actualización para renovar el caché.

## Principios del producto

- Día sin registro no equivale a 0 kcal; los reportes indican cobertura.
- Peso diario y tendencia son métricas diferentes.
- La IA interpreta imágenes y resúmenes; no hace cálculos nutricionales.
- Porciones visuales y sus macros se presentan como aproximados y editables.
- Sin lenguaje culpabilizante ni dietas extremas.
