import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

type PrismaCompatClient = PrismaClient & Record<string, unknown>;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaCompatClient;
};

function buildConnectionString(raw: string): string {
  try {
    const url = new URL(raw);
    if (!url.searchParams.has("connect_timeout")) {
      url.searchParams.set("connect_timeout", "5");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

function createPrismaClient(): PrismaCompatClient {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to initialize Prisma client");
  }

  const connectionString = buildConnectionString(process.env.DATABASE_URL);
  const adapter = new PrismaPg({ connectionString });

  const base = new PrismaClient({
    adapter,
    log: ["error", "warn"],
  }) as PrismaCompatClient;

  // Compat layer: resuelve nombres legacy mientras la migración modular avanza.
  const aliasMap: Record<string, string> = {
    securityUser: "security_users",
    securityUserScope: "security_user_scope",
    securityUserToken: "security_user_token",
    corpusAssessment: "audit_assessment",
    corpusAssessmentDraft: "audit_assessment_draft",
    corpusEvaluation: "audit_evaluation",
    corpusAuditLog: "audit_log",
    corpusDomain: "domain",
    corpusFramework: "corpus_framework",
    corpusFrameworkVersion: "framework_version",
    corpusJurisdiction: "jurisdiction",
    corpusRisk: "risk",
    corpusCatalogAuditFindingType: "audit_finding_type",
    corpusAuditFinding: "audit_finding",
    objective: "company_objective",
  };

  const compat = new Proxy(base as Record<string, unknown>, {
    get(target, prop: string | symbol) {
      if (typeof prop !== "string") return (target as Record<symbol, unknown>)[prop as symbol];
      if (prop in aliasMap) return target[aliasMap[prop]];
      if (prop === "corpus") {
        return { assessment_draft: target["audit_assessment_draft"] };
      }
      return target[prop];
    },
  });

  return compat as PrismaCompatClient;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
