# Continuar Nutrición Andrés con otra IA

Última actualización: 29 de septiembre de 2026.

Este archivo permite retomar el proyecto sin acceder al chat anterior. Es un checkpoint, no una afirmación de que toda la aplicación esté terminada. Contrastá siempre lo indicado con el código, `git status` y las pruebas. No contiene claves ni contraseñas.

## 1. Mensaje para copiarle a la próxima IA

> Continuá este proyecto existente, no lo reconstruyas desde cero. Leé completamente `AGENTS.md`, `CONTINUAR_CON_OTRA_IA.md` y `EXECUTION_PLAN.md`. Revisá el estado de Git y preservá los cambios existentes. Trabajamos en una PWA llamada NUTRICIÓN ANDRÉS. El hosting elegido es Vercel y entrenamiento desde PDF va al final. El próximo trabajo es cerrar reportes e historial con semanas/meses calendario y objetivos históricos correctos, y después validar favoritos/recetas de punta a punta. No guardes fotos, no expongas secretos ni borres datos reales. Separá lo implementado de lo probado. Hacé las pruebas con cuentas temporales y actualizá este archivo al terminar. Si una decisión o credencial realmente bloquea el avance, consultame y esperá mi respuesta.

## 2. Proyecto y decisiones del usuario

- Nombre visible: **NUTRICIÓN ANDRÉS**.
- Directorio en esta computadora: `/Volumes/DevSSD/PERSONAL/andres-nutricion`.
- Repositorio: `https://github.com/andres34cortez/andres-nutricion.git`.
- Rama de trabajo actual: `main`.
- Idioma: español rioplatense; interfaz pensada para celular/iPhone.
- Hosting: **Vercel**, publicado en `https://andres-nutricion.vercel.app`. PostgreSQL administrado y variables de Producción están configurados.
- Google OAuth funciona en Producción. `AUTH_SECRET` se corrigió el 28/09 tras confirmar `MissingSecret` en los logs de Vercel.
- Entrenamiento/PDF se hace **al final**, aunque una tabla inicial lo ubicaba tercero. La instrucción posterior cambió el orden.
- El indicador de conexión no debe aparecer cuando funciona: mostrar solo aviso rojo **Sin conexión** y ocultarlo al recuperar conexión.
- El usuario pidió altura: ahora aparece destacada como **¿Cuánto medís? / Altura (cm)** en el primer paso del cuestionario y al principio de Perfil. Ejemplo: 1,75 m se ingresa como 175. Editable y persistente.
- El usuario autorizó mantener el progreso en el repositorio. Nunca subir `.env`, tokens ni datos personales de prueba.

## 3. Reglas que no se deben romper

1. **Nunca persistir fotografías de comidas** en archivos, DB, localStorage, caché o logs. Se procesan transitoriamente con Gemini y solo se guardan los datos estructurados confirmados: fecha, hora, categoría, ingredientes, cantidades y macros.
2. No registrar errores crudos del proveedor de IA: podrían contener información del request. El endpoint registra únicamente un código genérico.
3. Gemini detecta ingredientes y hace preguntas; **no inventa calorías**. El cálculo usa referencias del catálogo o valores ingresados por la persona.
4. Un dato nutricional desconocido queda vacío, no cero. Los cuatro valores en cero requieren confirmación explícita (ejemplo: agua), validada también en `/api/records`.
5. No convertir gramos, unidades, scoops o mililitros sin una referencia válida. Cambiar unidad invalida los macros del editor; cambiar cantidad recalcula proporcionalmente desde una base estable.
6. La persona confirma antes de guardar. Un día sin comidas registradas no equivale a un día de consumo cero en reportes.
7. Guardar instantes en DB y agrupar/mostrar según la zona horaria del perfil. No usar el día UTC como día local.
8. No inventar una altura por defecto. Sin altura registrada se devuelve `null`; el inicio lleva al cuestionario si falta ese dato, incluso si el perfil estaba marcado como completado.
9. Cada API de datos debe comprobar sesión y pertenencia del registro. No admitir IDs de otro usuario.
10. No borrar ni reemplazar registros reales para probar. Los scripts crean usuarios UUID temporales y eliminan únicamente sus IDs al terminar.
11. No ejecutar `prisma migrate reset`, ni volver a sembrar datos a ciegas sobre la base existente. Las bases locales antiguas `floyd` y `nutriapp` no fueron eliminadas; no hay autorización específica para borrarlas.
12. No asumir que un botón, un mock o un build prueban una integración real. Informar claramente qué se verificó.

## 4. Stack y configuración local

- Next.js 16.3.6 / App Router, React 19, TypeScript, Tailwind y shadcn/ui.
- Prisma 6 / PostgreSQL, Auth.js (`next-auth` v5 beta) con adapter Prisma y sesiones JWT.
- Gemini vía `@google/genai`; modelo principal `gemini-3.8-flash` y fallback temporal verificado `gemini-3.6-flash`. No cambiar modelos sin comprobar disponibilidad real con la clave configurada.
- Vitest + Testing Library; Playwright para recorridos reales aislados en Chrome.
- Gestor: pnpm 10; Node.js 22 o compatible.
- Última configuración verificada: `APP_DEMO_MODE=false`; PostgreSQL nativo en `127.0.0.1:5432`, base `nutricion_andres`.
- `compose.yaml` ofrece una alternativa Docker en puerto 5433. No levantar una segunda base ni cambiar `DATABASE_URL` si la actual funciona.
- Secretos locales en `.env`, ignorado por Git. `.env.example` contiene nombres y ejemplos, no secretos de producción.
- La API Gemini está configurada localmente. OAuth Google usa **otras** credenciales (`AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET`) y ya funciona en Producción. No pedir que se peguen secretos en el chat.
- Hay acceso local de desarrollo existente; no se documenta la contraseña en este archivo. Las pruebas de registros y navegador crean sus propias cuentas. El acceso débil de desarrollo está bloqueado en producción por código.

## 5. Cómo retomar sin romper el entorno

Desde el directorio del proyecto:

```bash
git status --short
git log -5 --oneline
curl -s http://localhost:3000/api/health
```

Si el servidor ya responde, no levantar otro sobre el mismo puerto. Si no está iniciado:

```bash
pnpm dev
```

En una instalación nueva, configurar primero las variables locales y PostgreSQL; luego:

```bash
pnpm install
pnpm db:generate
pnpm prisma migrate deploy
pnpm dev
```

Los scripts de integración cargan **`.env`** mediante `node --env-file=.env`. No alcanza con que una credencial esté solo en `.env.local` para esos scripts. No imprimir ni copiar el contenido de `.env` a documentación.

Leer `AGENTS.md`: esta versión de Next.js requiere consultar las guías instaladas en `node_modules/next/dist/docs/` antes de cambiar patrones del framework. Mantener la arquitectura actual; no migrar autenticación o rehacer el diseño por iniciativa propia.

## 6. Estado real al entregar este checkpoint

| Área | Implementado y/o verificado | Todavía pendiente |
|---|---|---|
| Registros | CRUD comidas/peso/actividad; validación, pertenencia, fechas locales; pruebas API + DB y navegador real; idempotencia de servidor en `/api/records` con ID de cliente | Sin bloqueo conocido en los casos probados |
| Fotos | Vista previa inmediata; preparación/reducción en memoria; estados “Preparando” y “Analizando”; detección Gemini con fallback 3.8→3.6 ante 429/5xx; error específico y reintento sin perder la foto; corregir/agregar/excluir ingredientes, cantidades/unidades, catálogo/manual, confirmar y guardar. Verificado por componentes, navegador móvil y API real con imagen sintética | Probar una foto real de comida desde el iPhone después del despliegue 0.1.3 |
| Cuestionario | Nuevos perfiles sin completar pasan por 4 pasos; hábitos/consumos/actividad/objetivos persistentes; repetir desde Perfil conserva historial | Revisiones generales de UX/accesibilidad antes de publicar |
| Recomendación nutricional | El paso 4 calcula mantenimiento y una propuesta inicial editable de calorías/macros según edad, sexo biológico, altura, peso, actividad, entrenamiento y objetivo; permite restaurar la recomendación | Es una estimación para adultos, no reemplaza indicación profesional |
| Altura | Campo destacado en cuestionario y Perfil; centímetros; edición con decimales; persistencia; límites 100–250; sin altura inventada | Sin bloqueo conocido en los casos probados |
| Historial/reportes | Navegación de semanas/meses calendario y 7d/30d/90d; fecha de referencia y botones anterior/hoy/siguiente; objetivos históricos vigentes en vista diaria y reportes; verificación Playwright `scripts/verify-reports.mjs` | Sin bloqueo conocido en los casos probados |
| Catálogo/recetas | UI y API de alimentos propios/favoritos, recetas por ingredientes y porciones, agregar al diario; unidades semilla corregidas; tests unitarios y de componentes completos | Sin bloqueo conocido en los casos probados |
| Google | Provider, ingreso, callback productivo, usuario nuevo → cuestionario, vinculación desde Perfil y cierre de sesión; endpoint y apertura de Google verificados en Vercel | Probar vinculación de una cuenta local real sin perder datos |
| PWA/conexión | Manifest/iconos; health sin caché; solo rojo offline; service worker limita caché a recursos públicos | Instalación y funcionamiento real en iPhone, revisión completa de privacidad/caché; no hay cola offline de escrituras |
| Publicación | Vercel productivo en `andres-nutricion.vercel.app`; Auth.js, Google, DB, build y alias productivo verificados | Instalación y uso continuado en iPhone real |
| Entrenamiento | Solo modelos `Routine` y `RoutineDay` | Importación PDF, separación por días, sesión guiada, series/repeticiones/pesos e historial. Hacer último |

## 7. Próximo trabajo recomendado

1. Verificación de PWA e instalación en iPhone real (requiere dispositivo físico).
2. Probar con uso real y ajustar la recomendación inicial según criterio del usuario/nutricionista.
3. **Entrenamiento desde PDF** (última etapa acordada): importación de PDF, rutinas por días, sesiones guiadas y registro de pesos/repeticiones.

## 8. Mapa del código

- `src/components/nutrition-app.tsx`: pestañas, apertura de formularios, guardado/refresco, edición/borrado, vista diaria e historial con objetivos vigentes en la fecha (`goalForDay`).
- `src/components/record-editor.tsx`: cantidades y nutrición editable. Conserva una base para recalcular sin deriva de redondeo; protege doble envío y muestra errores sin descartar datos.
- `src/components/food-scanner.tsx` y `src/lib/photo-processing.ts`: vista previa, reducción transitoria, progreso, reintento y revisión; pasa `missingNutrition` al editor para campos desconocidos vacíos.
- `src/lib/record-validation.ts`: validación compartida. `zeroNutritionConfirmed` es confirmación transitoria; `/api/records` no la intenta escribir como columna Prisma.
- `src/app/api/records/route.ts`: CRUD unificado con idempotencia en `POST` usando ID de cliente; transacciones en comidas y ownership.
- `src/server/app-data.ts` y `src/app/api/data/route.ts`: lectura completa por usuario y serialización para UI. `MealEntry.id` identifica un ingrediente y `mealId` identifica la comida agrupada.
- `src/lib/dates.ts` y `src/lib/reports.ts`: fechas locales y utilidades históricas. `src/lib/report-period.ts`, `src/lib/goal-history.ts`, `src/lib/period-summary.ts` y `src/components/reports-view.tsx`: semanas/meses calendario, navegación, cobertura y gráficos.
- `src/components/library.tsx`, `/api/library`: catálogo, favoritos, recetas por porciones.
- `src/components/questionnaire.tsx`, `src/lib/questionnaire.ts`, `src/lib/nutrition-recommendation.ts`, `/onboarding`, `/api/onboarding`: cuestionario y recomendación editable. Perfil guarda campos escalares y JSON de respuestas.
- `src/components/height-field.tsx`: altura compartida por cuestionario y Perfil. `src/components/profile-view.tsx` permite editarla y exportar datos.
- `src/app/api/profile/route.ts` y `src/server/goals.ts`: perfil y vigencia de objetivos.
- `src/auth.ts`, `/sign-in`, `src/components/account-controls.tsx`: autenticación y Google condicional.
- `src/server/ai/gemini.ts` y `/api/ai/food`: detector IA sin cálculo de calorías. `/api/ai/progress` interpreta resúmenes numéricos.
- `src/components/connection-status.tsx`, `/api/health`, `public/sw.js`: conexión y caché pública.
- `prisma/schema.prisma` y `prisma/migrations/`: modelo y migraciones.

## 9. Verificación reproducible

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:smoke
pnpm test:records
pnpm test:browser
node --env-file=.env scripts/verify-reports.mjs
```

- Versión preparada: **0.1.3**. Último resultado unitario/componentes: **101 tests, 17 archivos, todos pasan**; lint, TypeScript y build de producción también pasan.
- `test:records`: servidor en 3000 + PostgreSQL. Crea dos cuentas temporales, verifica onboarding/perfil/altura, CRUD y fechas, rechazos sin pérdida de datos, 401/404 e aislamiento; limpia ambos usuarios por IDs exactos.
- `test:browser`: Chrome instalado, perfil/contexto aislado de 390×844. Login por UI; vista previa/progreso/error/reintento de foto; editar altura y recargar; alta/edición/recarga/borrado de comidas/peso/actividad; macros proporcionales, consultas de DB y ausencia de desborde horizontal.
- `scripts/verify-reports.mjs`: verificación Playwright de semanas y meses calendario, año bisiesto, objetivos históricos por medianoche local, comparación con período anterior y responsive 390px sin desborde horizontal.
- `test:smoke`: rutas públicas/PWA y rechazo de APIs privadas anónimas.
- `test:ai` llama **realmente** a Gemini, puede consumir cuota y usa el acceso local configurado por el script. El 28/09/2026 confirmó sesión → API → fallback Gemini 3.6 → tres ingredientes estructurados con una imagen de comida generada en memoria. No confundirlo con una foto real del usuario ni repetirlo sin necesidad.
- Una vista móvil simulada en Chrome **no es un iPhone real**. La prueba de instalación/PWA en iOS sigue pendiente.
- En desarrollo el logo flotante de Next puede tapar “Hoy”. El test navega con recarga normal en ese caso; no fuerza clics ni oculta errores de aplicación. No se ha movido el indicador de desarrollo.

## 10. Riesgos concretos a revisar sin perder el foco

- En `prisma/seed.ts`, whey tiene `servingAmount: 30` con `servingUnit: "scoop"`, pero una receta lo usa como 60 g. Revisar/corregir el seed con criterio y tratar datos existentes por separado: **no sobrescribir datos reales automáticamente**.
- `getAppData` carga todo el historial; faltará paginación o límites a medida que aumenten los datos.
- La edad se deriva de una fecha estimada usando años promedio; revisar exactitud alrededor del cumpleaños si se profundiza el perfil.
- Existen rutas antiguas `/api/meals`, `/api/weights`, `/api/activities` además de `/api/records`. La UI nueva usa esta última. No afirmar que una validación nueva cubre las rutas antiguas sin revisarlas.
- Si la escritura se confirma y falla solo el refresco, se cierra el formulario y se ofrece reintentar **lectura**, evitando escribir de nuevo. Si la respuesta de escritura es incierta, se advierte revisar historial antes de reintentar.
- El aviso de registro guardado se limpia al abrir otro formulario porque antes bloqueaba opciones del menú móvil.

## 11. Git y continuidad

Hito previo subido a GitHub: `3c87420` (`feat: complete onboarding and harden nutrition record flows`). Después se agregaron la mejora de altura, las pruebas correspondientes, la elección de Vercel y este archivo. Consultar `git log` para conocer el commit actual; no asumir que ese hito sigue siendo HEAD.

Documentos complementarios:

- `EXECUTION_PLAN.md`: checklist vivo. Una casilla pendiente puede tener implementación parcial, no significa que no exista código.
- `PROJECT_STATUS.md`: contiene una sección de checkpoint histórico; no usar sus conteos antiguos como estado actual.
- `README.md`: stack y comandos. Para pruebas de integración, usar `.env` como se indica arriba.

Al terminar otra etapa, actualizar este archivo con resultados reales, decisiones, pendientes y errores conocidos. No escribir que algo está terminado si solo quedó preparado en código.
