BEGIN;

ALTER TABLE public.incident_register
  DROP CONSTRAINT IF EXISTS fk_incident_control;

ALTER TABLE public.incident_register
  DROP CONSTRAINT IF EXISTS fk_incident_risk;

COMMENT ON COLUMN public.incident_register.control_id IS
  'Referencia informativa al control capturado al momento del incidente. No mantiene FK dura hacia run_ra_controls porque el incidente debe sobrevivir al ciclo de vida de evaluaciones.';

COMMENT ON COLUMN public.incident_register.risk_id IS
  'Referencia informativa al riesgo capturado al momento del incidente. No mantiene FK dura hacia run_ra_risks porque el incidente debe sobrevivir al ciclo de vida de evaluaciones.';

COMMIT;
