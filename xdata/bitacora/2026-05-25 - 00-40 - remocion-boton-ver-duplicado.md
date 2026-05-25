# Bitacora de actividad

- Fecha: 2026-05-25 00:40:00
- Tarea: Remover botón redundante "Ver" en la columna de Acciones del listado de evaluaciones.
- Hallazgo: En la columna de Acciones de la tabla de evaluaciones del StepDashboard.tsx se estaban renderizando dos botones que realizaban la misma acción `onOpenEvaluation`: uno dinámico según el estado y otro estático con icono `Eye` y título "Ver". Esto producía que para las evaluaciones con estado "COMPLETADA", aparecieran dos botones "Ver" idénticos.
- Acciones: Se eliminó el segundo botón redundante de la tabla de evaluaciones en StepDashboard.tsx, dejando únicamente el primer botón dinámico que cambia de icono e indicación según el estado (icono de `Eye` / "Ver" para completadas, `FolderOpen` / "Abrir" para tratamiento, y `Play` / "Continuar" para borradores/procesos).
- Validacion: compilación exitosa sin errores usando `npx tsc --noEmit`.
