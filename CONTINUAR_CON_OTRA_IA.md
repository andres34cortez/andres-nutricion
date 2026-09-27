# Continuar Nutrición Andrés con otra IA

Última actualización: 27 de septiembre de 2026.

Este archivo permite retomar el proyecto sin acceder al chat anterior. Es un checkpoint, no una afirmación de que toda la aplicación esté terminada. Contrastá siempre lo indicado con el código, `git status` y las pruebas. No contiene claves ni contraseñas.

## 1. Mensaje para copiarle a la próxima IA

> Continuá este proyecto existente, no lo reconstruyas desde cero. Leé completamente `AGENTS.md`, `CONTINUAR_CON_OTRA_IA.md` y `EXECUTION_PLAN.md`. Revisá el estado de Git y preservá los cambios existentes. Trabajamos en una PWA llamada NUTRICIÓN ANDRÉS. El hosting elegido es Vercel y entrenamiento desde PDF va al final. El próximo trabajo es cerrar reportes e historial con semanas/meses calendario y objetivos históricos correctos, y después validar favoritos/recetas de punta a punta. No guardes fotos, no expongas secretos ni borres datos reales. Separá lo implementado de lo probado. Hacé las pruebas con cuentas temporales y actualizá este archivo al terminar. Si una decisión o credencial realmente bloquea el avance, consultame y esperá mi respuesta.

## 2. Proyecto y decisiones del usuario

- Nombre visible: **NUTRICIÓN ANDRÉS**.
- Directorio en esta computadora: `/Volumes/DevSSD/PERSONAL/andres-nutricion`.
- Repositorio: `https://github.com/andres34cortez/andres-nutricion.git`.
- Rama de trabajo actual: `main`.
- Idioma: español rioplatense; interfaz pensada para celular/iPhone.
- Hosting confirmado por el usuario: **Vercel**. Aún no se publicó ni se eligió/configuró PostgreSQL administrado de producción. No contratar servicios pagos sin consultar.
- Google OAuth debe incorporarse; el código básico ya existe, faltan credenciales y validación real.
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
- Gemini vía `@google/genai`; modelo configurado por `GEMINI_MODEL` (configuración actual: `gemini-3.8-flash`). No cambiarlo sin comprobar disponibilidad.
- Vitest + Testing Library; Playwright para recorridos reales aislados en Chrome.
- Gestor: pnpm 10; Node.js 22 o compatible.
- Última configuración verificada: `APP_DEMO_MODE=false`; PostgreSQL nativo en `127.0.0.1:5432`, base `nutricion_andres`.
- `compose.yaml` ofrece una alternativa Docker en puerto 5433. No levantar una segunda base ni cambiar `DATABASE_URL` si la actual funciona.
- Secretos locales en `.env`, ignorado por Git. `.env.example` contiene nombres y ejemplos, no secretos de producción.
- La API Gemini ya está configurada localmente. OAuth Google usa **otras** credenciales: `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET`, todavía pendientes. No pedir que se peguen secretos en el chat.
- Hay acceso local de desarrollo existente; no se documenta la contraseña en este archivo. Las pruebas de registros y navegador crean sus propias cuentas. El acceso débil de desarrollo está bloqueado en producción por código; falta comprobar el despliegue real.

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
| Registros | CRUD comidas/peso/actividad; validación, pertenencia, fechas locales; pruebas API + DB y navegador real | Idempotencia de servidor para reintentos tras respuesta incierta |
| Fotos | Detección Gemini, corregir/agregar/excluir ingredientes, cantidades/unidades, preguntas, catálogo/manual, confirmar y guardar; recálculo y datos faltantes protegidos | Probar el recorrido actualizado con fotos reales del usuario; pruebas nuevas de scanner usan mocks |
| Cuestionario | Nuevos perfiles sin completar pasan por 4 pasos; hábitos/consumos/actividad/objetivos persistentes; repetir desde Perfil conserva historial | Revisiones generales de UX/accesibilidad antes de publicar |
| Altura | Campo destacado en cuestionario y Perfil; centímetros; edición con decimales; persistencia; límites 100–250; sin altura inventada | Sin bloqueo conocido en los casos probados |
| Historial/reportes | Navegación de fechas/meses, filtros móviles 7/30/90 días, cobertura, comparaciones, gráficos de calorías/peso y exportación JSON | Semanas/meses calendario reales, objetivos históricos coherentes en todas las vistas y validación E2E |
| Catálogo/recetas | UI y API de alimentos propios/favoritos, recetas por ingredientes y porciones, agregar al diario | Validación E2E completa y revisión de unidades de datos semilla |
| Google | Provider condicional, botón de ingreso/vinculación y cierre de sesión | Credenciales OAuth, callbacks local/producción y prueba real de vinculación sin perder datos |
| PWA/conexión | Manifest/iconos; health sin caché; solo rojo offline; service worker limita caché a recursos públicos | Instalación y funcionamiento real en iPhone, revisión completa de privacidad/caché; no hay cola offline de escrituras |
| Publicación | Vercel elegido, build pasa | Vincular proyecto, PostgreSQL administrado, secretos, migraciones, Google de producción y pruebas remotas |
| Entrenamiento | Solo modelos `Routine` y `RoutineDay` | Importación PDF, separación por días, sesión guiada, series/repeticiones/pesos e historial. Hacer último |

## 7. Próximo trabajo recomendado

1. Cerrar **historial/reportes**: permitir semana calendario y mes calendario además de ventanas móviles; comparar períodos equivalentes y mantener cobertura explícita.
2. Corregir el resumen de `Hoy/Historial` para que al consultar una fecha pasada muestre los objetivos vigentes entonces. Actualmente el resumen usa `data.profile` (objetivos actuales), aunque los reportes ya tienen lógica histórica.
3. Definir y probar los límites de vigencia cuando cambian objetivos el mismo día. Probar meses de distinta duración, año bisiesto, días vacíos y límites horarios.
4. Cerrar **favoritos/recetas** con pruebas de creación/edición/eliminación y porciones que llegan correctamente al diario. Revisar las unidades antes de calcular.
5. Implementar idempotencia de registros para evitar duplicados si el servidor guarda y se pierde la respuesta. Hoy hay bloqueo de doble clic, pero no garantía de reintento exactamente una vez.
6. Continuar con Google y preparación de Vercel; consultar al usuario solo por credenciales o elecciones externas necesarias. Entrenamiento va después de lo anterior.

No se necesita información nueva del usuario para empezar reportes y catálogo. Para OAuth, hosting/DB e iPhone sí habrá intervención externa. El PDF se pedirá cuando toque entrenamiento.

## 8. Mapa del código

- `src/components/nutrition-app.tsx`: pestañas, apertura de formularios, guardado/refresco, edición/borrado, vista diaria e historial.
- `src/components/record-editor.tsx`: cantidades y nutrición editable. Conserva una base para recalcular sin deriva de redondeo; protege doble envío y muestra errores sin descartar datos.
- `src/components/food-scanner.tsx`: foto transitoria y revisión; pasa `missingNutrition` al editor para campos desconocidos vacíos.
- `src/lib/record-validation.ts`: validación compartida. `zeroNutritionConfirmed` es confirmación transitoria; `/api/records` no la intenta escribir como columna Prisma.
- `src/app/api/records/route.ts`: CRUD unificado; transacciones en comidas y ownership. Limpiar pasos/distancia escribe `null`, no `undefined`.
- `src/server/app-data.ts` y `src/app/api/data/route.ts`: lectura completa por usuario y serialización para UI. `MealEntry.id` identifica un ingrediente y `mealId` identifica la comida agrupada.
- `src/lib/dates.ts` y `src/lib/reports.ts`: fechas locales y utilidades históricas. `src/lib/period-summary.ts` y `src/components/reports-view.tsx`: períodos, cobertura, gráficos.
- `src/components/library.tsx`, `/api/library`: catálogo, favoritos, recetas.
- `src/components/questionnaire.tsx`, `src/lib/questionnaire.ts`, `/onboarding`, `/api/onboarding`: cuestionario. Perfil guarda campos escalares y JSON de respuestas.
- `src/components/height-field.tsx`: altura compartida por cuestionario y Perfil. `src/components/profile-view.tsx` permite editarla y exportar datos.
- `src/app/api/profile/route.ts` y `src/server/goals.ts`: perfil y vigencia de objetivos.
- `src/auth.ts`, `/sign-in`, `src/components/account-controls.tsx`: autenticación y Google condicional.
- `src/server/ai/gemini.ts` y `/api/ai/food`: detector IA sin cálculo de calorías. `/api/ai/progress` interpreta resúmenes numéricos.
- `src/components/connection-status.tsx`, `/api/health`, `public/sw.js`: conexión y caché pública.
- `prisma/schema.prisma` y `prisma/migrations/`: modelo y migraciones; onboarding ya migrado. Altura usa `Profile.heightCm`, no requirió nueva migración.

## 9. Verificación reproducible

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:smoke
pnpm test:records
pnpm test:browser
```

- Último resultado unitario/componentes: **45 tests, 9 archivos, todos pasan**; lint, TypeScript y build de producción también, incluyendo la mejora de altura.
- `test:records`: servidor en 3000 + PostgreSQL. Crea dos cuentas temporales, verifica onboarding/perfil/altura, CRUD y fechas, rechazos sin pérdida de datos, 401/404 e aislamiento; limpia ambos usuarios por IDs exactos.
- `test:browser`: Chrome instalado, perfil/contexto aislado de 390×844. Login por UI, editar altura y recargar, alta/edición/recarga/borrado de comidas/peso/actividad, macros proporcionales, consultas de DB y ausencia de desborde horizontal. No usa cookies ni registros del usuario. Capturas en carpeta temporal indicada por stdout.
- `test:smoke`: rutas públicas/PWA y rechazo de APIs privadas anónimas.
- `test:ai` es distinto: llama **realmente** a Gemini, puede consumir cuota y usa el acceso local configurado por el script. No confundirlo con las pruebas con mocks ni ejecutarlo repetidamente sin necesidad. Hubo prueba real en una etapa anterior; no se repitió con fotos reales en este checkpoint.
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
