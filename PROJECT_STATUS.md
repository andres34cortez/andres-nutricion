# Estado del proyecto — Nutrición Andrés

Checkpoint actualizado el 27 de septiembre de 2026.

## Actualización de registros y fotos — 27/09, segunda etapa

Este apartado reemplaza los conteos y pendientes anteriores cuando difieren. El plan vigente está en `EXECUTION_PLAN.md`.

- Cuestionario inicial persistente y repetible desde Perfil, sin borrar registros existentes.
- CRUD de comidas, peso y actividad con validación y aislamiento por usuario; zona horaria consistente, incluyendo fechas en límites de día, mes y año.
- Editor con recálculo proporcional de cantidades desde una base estable, valores faltantes vacíos y confirmación explícita de nutrición completamente cero. Cambiar unidad exige volver a ingresar valores.
- Escáner permite corregir/agregar/excluir ingredientes, cantidades, unidades y preguntas; usa catálogo compatible o macros manuales, sin inventar conversiones. La foto no se persiste y los errores crudos de IA no se registran.
- Errores de guardado conservan el formulario. Si el servidor confirma la escritura pero falla la actualización de pantalla, se reintenta solo la lectura. Aún falta idempotencia para respuestas de escritura inciertas por corte de red.
- Aviso de conexión visible únicamente en rojo sin conexión; caché del service worker limitada a recursos públicos.
- Google preparado en código pero sin credenciales OAuth y sin validación real. Catálogo/recetas e informes avanzados implementados parcialmente y pendientes de cierre según plan.
- Verificación actual: 41 tests, TypeScript, lint, build de producción, smoke HTTP e integración real de registros aprobados. Pruebas nuevas del escáner con mocks; no afirmar una nueva prueba real de Gemini.
- `pnpm test:browser` aprobado en Chrome aislado, viewport 390×844: login UI, CRUD de los tres tipos, recarga, proporciones, hora local y confirmación en PostgreSQL; 9 operaciones HTTP reales, sin errores de aplicación ni desborde horizontal. Se corrigió un aviso persistente que interceptaba clics del menú. Todos los fixtures fueron eliminados por sus IDs exactos.
- Pendientes: prueba en iPhone real, publicación, Google real, cierre de informes y catálogo; entrenamiento PDF al final.

## Checkpoint anterior — referencia histórica

Lo que sigue documenta la etapa previa. Para el estado actual prevalecen la actualización superior y `EXECUTION_PLAN.md`.

## Repositorio

- Rama: `main`
- Remoto: `https://github.com/andres34cortez/andres-nutricion.git`
- Stack: Next.js 16, React 19, TypeScript, shadcn/ui, Prisma, PostgreSQL, Auth.js y Gemini.
- La aplicación local se inicia con `pnpm dev` en `http://localhost:3000`.

## Funcionalidad terminada

- PWA mobile-first llamada **NUTRICIÓN ANDRÉS**.
- Inicio con calorías, proteína, carbohidratos y grasas.
- Registro manual de comidas y eliminación de registros.
- Registro de peso y actividad.
- Historial diario, tendencias, gráficos y perfil con objetivos editables.
- Persistencia PostgreSQL por usuario y modo local en el navegador para demostración.
- Autenticación local real con alias `admin`; la contraseña temporal local también es `admin`.
- El alias `admin` está desactivado automáticamente en producción.
- Indicador global superior de conexión: verde conectado, rojo sin conexión.
- Análisis de fotos con Gemini `gemini-3.8-flash` y respuesta validada mediante esquema JSON.
- Las imágenes se procesan en memoria y no se guardan en disco, base de datos, historial ni logs.
- Manifiesto, service worker e icono PWA corregidos.
- APIs privadas protegidas contra sesiones anónimas.

## Configuración local

- Los secretos viven únicamente en `.env`, que está ignorado por Git.
- `.env.example` está sanitizado y sí se versiona.
- `APP_DEMO_MODE=false` para usar autenticación y PostgreSQL reales.
- PostgreSQL nativo está disponible en `127.0.0.1:5432`.
- Base activa: `nutricion_andres`.
- Se aplicó la migración inicial y el seed conserva perfil, objetivos y alimentos de Andrés.
- `compose.yaml` ofrece PostgreSQL 16 alternativo en el puerto `5433` para evitar conflictos.
- La clave Gemini fue comprobada correctamente; nunca se imprimió ni se versionó.

## Verificación completada

- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado.
- `pnpm test`: 15 pruebas aprobadas en 5 archivos.
- `pnpm test:smoke`: PWA, rutas y seguridad aprobadas.
- `pnpm test:ai`: sesión real + endpoint protegido + Gemini con imagen generada en memoria, aprobado.
- `pnpm build`: build de producción aprobado.
- Flujo visible comprobado en el navegador con cuenta real e indicador `Conectado`.

## Pendientes acordados

1. Más adelante integrar Google OAuth para dejar de manejar contraseñas.
2. Antes de publicar, eliminar o cambiar el acceso débil `admin / admin`.
3. Implementar subida de PDF de rutina, separación automática por días y modo entrenamiento guiado que indique cada ejercicio y registre el peso realizado.
4. Preparar despliegue en Vercel y una base PostgreSQL administrada, probablemente Neon.
5. Decidir si se eliminan las bases locales antiguas `floyd` y `nutriapp`. Ambas contienen tablas reales, no tienen conexiones activas y **no fueron borradas** por seguridad.

## Reglas importantes del producto

- Nunca guardar fotografías de comidas.
- Guardar solamente fecha, hora, categoría de comida, cantidades, calorías, proteínas, carbohidratos, grasas y demás datos estructurados confirmados.
- La IA propone; el usuario confirma antes de guardar.
- Un día sin registro no equivale a cero calorías.
- Mantener lenguaje neutral, sin culpabilizar.

## Comandos útiles

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm test:smoke
pnpm test:ai
pnpm build
pnpm prisma migrate deploy
```
