BEGIN;

CREATE TABLE IF NOT EXISTS public.map_role_x_permission (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL,
  permission_code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT uq_map_role_x_permission UNIQUE (role_id, permission_code),
  CONSTRAINT fk_map_role_x_permission_role
    FOREIGN KEY (role_id)
    REFERENCES public.users_roles(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_map_role_x_permission_permission
    FOREIGN KEY (permission_code)
    REFERENCES public.users_permission(code)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_map_role_x_permission_role_id
  ON public.map_role_x_permission(role_id);

CREATE INDEX IF NOT EXISTS idx_map_role_x_permission_permission_code
  ON public.map_role_x_permission(permission_code);

COMMENT ON TABLE public.map_role_x_permission IS
  'Tabla puente que asigna permisos del sistema a roles internos de la empresa.';

COMMENT ON COLUMN public.map_role_x_permission.role_id IS
  'Rol interno o puesto corporativo que recibe el permiso.';

COMMENT ON COLUMN public.map_role_x_permission.permission_code IS
  'Código de permiso otorgado al rol.';

INSERT INTO public.users_permission (
  code,
  module_code,
  name,
  description,
  is_active,
  created_at,
  updated_at
)
VALUES
  ('catalog.read', 'catalog', 'Read catalog', 'Permite acceder al módulo PLAFT y sus vistas.', true, now(), now()),
  ('catalog.write', 'catalog', 'Write catalog', 'Permite crear, editar y administrar catálogos de PLAFT.', true, now(), now()),
  ('company.read', 'company', 'Read company', 'Permite acceder al módulo de gobierno de auditoría.', true, now(), now()),
  ('company.write', 'company', 'Write company', 'Permite crear, editar y administrar información del módulo de gobierno de auditoría.', true, now(), now()),
  ('core.read', 'core', 'Read core', 'Permite acceder al core y al launchpad principal.', true, now(), now()),
  ('hechos-relevantes.read', 'hechos-relevantes', 'Read incidents', 'Permite acceder al módulo de incidentes y hechos relevantes.', true, now(), now()),
  ('hechos-relevantes.write', 'hechos-relevantes', 'Write incidents', 'Permite registrar y gestionar incidentes y hechos relevantes.', true, now(), now()),
  ('incident.read', 'incident', 'Read incident', 'Permite acceder al módulo de análisis preventivo.', true, now(), now()),
  ('incident.write', 'incident', 'Write incident', 'Permite crear y administrar elementos del módulo de análisis preventivo.', true, now(), now()),
  ('linear-risk.read', 'linear-risk', 'Read linear risk', 'Permite acceder al módulo de gobierno de IA y riesgo lineal.', true, now(), now()),
  ('linear-risk.write', 'linear-risk', 'Write linear risk', 'Permite crear, editar y administrar corridas y artefactos de riesgo lineal.', true, now(), now()),
  ('monitoring.read', 'monitoring', 'Read monitoring', 'Permite acceder al módulo de continuidad y monitoreo ejecutivo.', true, now(), now()),
  ('monitoring.write', 'monitoring', 'Write monitoring', 'Permite crear, editar y administrar elementos del módulo de monitoreo.', true, now(), now()),
  ('plugins.read', 'plugins', 'Read plugins', 'Permite acceder al marketplace y a la gestión de extensiones.', true, now(), now()),
  ('plugins.write', 'plugins', 'Write plugins', 'Permite instalar y administrar extensiones del sistema.', true, now(), now()),
  ('reportes.read', 'reportes', 'Read reports', 'Permite acceder al módulo de reportes y Kiriox Risk Average.', true, now(), now()),
  ('reportes.write', 'reportes', 'Write reports', 'Permite generar y administrar reportes del sistema.', true, now(), now()),
  ('simulation.read', 'simulation', 'Read simulation', 'Permite acceder al módulo de ciberseguridad y simulaciones.', true, now(), now()),
  ('simulation.run', 'simulation', 'Run simulation', 'Permite ejecutar simulaciones y análisis del módulo de ciberseguridad.', true, now(), now()),
  ('simulation.write', 'simulation', 'Write simulation', 'Permite administrar configuraciones y artefactos del módulo de simulaciones.', true, now(), now()),
  ('structural-risk.read', 'structural-risk', 'Read structural risk', 'Permite consultar capturas, grafos y resultados de riesgo estructural.', true, now(), now()),
  ('structural-risk.run', 'structural-risk', 'Run structural risk', 'Permite ejecutar corridas y análisis de riesgo estructural.', true, now(), now()),
  ('structural-risk.write', 'structural-risk', 'Write structural risk', 'Permite crear y editar artefactos del módulo de riesgo estructural.', true, now(), now())
ON CONFLICT (code) DO UPDATE
SET
  module_code = EXCLUDED.module_code,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO public.map_role_x_permission (
  role_id,
  permission_code,
  is_active,
  created_at,
  updated_at
)
SELECT
  r.id,
  p.code,
  true,
  now(),
  now()
FROM public.users_roles r
JOIN public.users_permission p
  ON COALESCE(p.is_active, true) = true
WHERE r.code = 'super_admin'
ON CONFLICT (role_id, permission_code) DO UPDATE
SET
  is_active = true,
  updated_at = now();

COMMIT;
