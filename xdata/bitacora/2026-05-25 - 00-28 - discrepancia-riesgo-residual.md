# Bitacora de actividad

- Fecha: 2026-05-25 00:28:00
- Tarea: Resolver discrepancia en la visualización del Riesgo Residual Total entre el Paso 3 (8.37) y el Paso 4 (18.00) para la evaluación RA-1779597087464.
- Hallazgo: 
  1. La interfaz del Paso 3 (StepAnalisisControl.tsx) y el repositorio (PrismaLinearRiskRepository.ts) calculaban el riesgo residual con la fórmula aditiva (`inherent - reduction` = `8.37`).
  2. Sin embargo, el endpoint de guardado en `src/modules/linear-risk/api/control-analysis/route.ts` calculaba el `residual_risk_score` con una fórmula de producto redondeado (`residualImpact * residualProbability * weight` = `18.00`) y lo persistía en la base de datos.
  3. Esto causaba que el Paso 4, al recuperar el valor almacenado en la DB, mostrara 18.00. Además, el heatmap del Paso 4 no pintaba correctamente los puntos debido a que el API `/api/linear-risk/risk-valuation` no devolvía los campos posicionales de coordenadas y el propietario.
- Acciones:
  1. Se modificó el controlador POST en `route.ts` para calcular y persistir el `residual_risk_score` usando la fórmula aditiva correspondiente (`inherent - totalReduction`), manteniendo los campos calculados de impacto y probabilidad residuales dentro de `calculation_rationale`.
  2. Se actualizó el método `getRiskValuationData` en `PrismaLinearRiskRepository.ts` para seleccionar los campos `impact_score`, `probability_score`, `owner_id` e integrarlos junto con el nombre del propietario (`owner`) y los valores posicionales de impacto/probabilidad residuales del json de rationale en la respuesta de valoración, resolviendo la falta de graficación en el mapa de calor.
  3. Se ejecutó una consulta directa en base de datos para actualizar la corrida `RA-1779597087464` a un `residual_risk_score = 8.37` de modo que el estado del usuario sea consistente inmediatamente.
- Validacion: verificación de tipados mediante `npx tsc --noEmit` exitosa sin errores en el proyecto.
