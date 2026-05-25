# Bitacora de actividad

- Fecha: 2026-05-25 00:05:00
- Tarea: Corregir filtrado de actividades en combos, mostrar la actividad seleccionada como badge con degradado en el formulario de riesgos del Paso 2, y solucionar el movimiento de pantalla hacia arriba al abrir el formulario.
- Hallazgo: 
  1. Las actividades en getGeneralContext y getRiskAnalysisData no estaban filtradas por la empresa actual, provocando combos vacíos o inconsistentes.
  2. En el Paso 2 se requería mostrar visualmente el nombre de la actividad con un degradado en la cabecera del formulario de riesgos.
  3. Al abrir el formulario de riesgos mediante "Agregar al listado" o al editar, la pantalla se desplazaba bruscamente hacia arriba (`block: 'start'`), ocultando la parte superior del formulario (cabecera y botón de cerrar) bajo la barra de navegación superior (topbar pegajoso).
- Acciones:
  1. Se modificaron las consultas Raw SQL en PrismaLinearRiskRepository.ts para filtrar public.activities por `(company_id = companyId OR company_id IS NULL) AND is_active = true`.
  2. Se sustituyó el texto plano de ayuda en StepAnalisisRiesgo.tsx por un badge interactivo estilizado con un fondo degradado lineal que resalta el nombre de la actividad evaluada.
  3. Se corrigió el comportamiento del scroll al mostrar el formulario (`openNew` y `handleEdit`) cambiando la propiedad `block: 'start'` a `block: 'nearest'` en `scrollIntoView`. Esto previene el movimiento brusco de pantalla y mantiene visible toda la estructura del formulario de captura.
- Validacion: compilación exitosa sin errores usando `npx tsc --noEmit`.
