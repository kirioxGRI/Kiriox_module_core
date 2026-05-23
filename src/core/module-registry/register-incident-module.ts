import { incidentModule } from "@/modules/incident/incident.module";
import { kirioxModuleRegistry } from "./module-registry";

export function registerIncidentModule(): void {
  kirioxModuleRegistry.register(incidentModule);
}
