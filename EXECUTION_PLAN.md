# Plan de ejecución

Orden acordado: entrenamiento al final; agregar Google OAuth.

Actualización 27/09/2026: primera etapa de registros y fotos implementada. Las casillas marcadas incluyen comprobación automatizada; no equivalen a publicación ni a prueba en iPhone real.

## 1. Registro diario confiable
- [x] Fecha/hora y zona horaria coherentes; edición de registros anteriores.
- [x] Alta, edición y eliminación de comidas, peso y actividad con validación y ownership.
- [x] Perfil persistente y errores visibles; bloqueo de doble envío mientras guarda y actualización de pantalla separada de escritura confirmada.
- [x] Pruebas de persistencia y fechas, incluidos límites de día/mes/año y aislamiento entre usuarios.
- [x] Navegador real en viewport móvil 390×844: login, alta/edición/recarga/borrado de los tres tipos de registro, validación en PostgreSQL y sin desborde horizontal. Corregido aviso que tapaba opciones del menú.
- [ ] Idempotencia en servidor para reintentos después de una respuesta de red incierta. Por ahora se indica revisar el historial antes de reintentar.

## 2. Nutrición y escáner completo
- [ ] Catálogo personal editable y favoritos.
- [ ] Recetas por ingredientes, porciones y registro rápido.
- [x] Foto → ingredientes editables → aclaraciones → porciones → macros desde catálogo o ingresados manualmente → confirmación y guardado.
- [x] Cantidades recalculan macros desde una base estable; cambiar unidad invalida valores. Datos faltantes quedan vacíos; todos ceros requieren confirmación explícita en UI y API.
- [x] Ninguna foto persistida; errores recuperables, cancelación y registro manual disponible. No registrar errores crudos del proveedor de IA.
- [ ] Validar el recorrido actualizado con fotos reales del usuario (las pruebas nuevas del escáner usan respuestas controladas, no una nueva llamada real a Gemini).

## 3. Historial y reportes
- [ ] Calendario navegable, detalle por fecha, filtros reales.
- [ ] Rangos semanales/mensuales, cobertura y comparación con período anterior.
- [ ] Objetivos históricos y media móvil; exportación de datos.
- [ ] Análisis de períodos por IA sobre resúmenes calculados.

## 4. Conexión, PWA y Google
- [x] Chequeo de servidor sin caché; aviso rojo únicamente sin conexión, oculto al recuperar conexión.
- [ ] Caché limitada a recursos públicos, sin sesiones ni registros personales.
- [ ] Google OAuth, cierre de sesión y vinculación al usuario existente autenticado.
- [ ] Bloquear credenciales débiles en producción.
- [ ] Documentar credenciales OAuth y despliegue; validación real de Google pendiente de configuración externa.

## 5. Publicación
- [ ] Revisar responsive, accesibilidad y recorridos completos.
- [x] Lint, tipos, 41 tests, build y smoke tests para este checkpoint.
- [x] Test reproducible `pnpm test:browser` con Chrome aislado y cuenta temporal; no sustituye iPhone real ni recorre aún todas las funcionalidades.
- [ ] Configurar hosting/DB administrada y secretos cuando esté disponible el destino.
- [ ] Verificar en iPhone real (requiere dispositivo).

## 6. Entrenamiento — último
- [ ] Importar PDF, revisar y guardar días/ejercicios.
- [ ] Sesión guiada, series, repeticiones, pesos e historial.

Los puntos externos no bloquean el desarrollo local. No marcar completa una integración solo por tener un botón o un test con mocks.
