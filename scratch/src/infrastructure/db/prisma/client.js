"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("@/generated/prisma/client");
const globalForPrisma = globalThis;
function buildConnectionString(raw) {
    try {
        const url = new URL(raw);
        if (!url.searchParams.has("connect_timeout")) {
            url.searchParams.set("connect_timeout", "5");
        }
        return url.toString();
    }
    catch {
        return raw;
    }
}
function createPrismaClient() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is required to initialize Prisma client");
    }
    const connectionString = buildConnectionString(process.env.DATABASE_URL);
    const adapter = new adapter_pg_1.PrismaPg({ connectionString });
    const base = new client_1.PrismaClient({
        adapter,
        log: ["error", "warn"],
    });
    // Compat layer: resuelve nombres legacy mientras la migración modular avanza.
    const aliasMap = {
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
    const compat = new Proxy(base, {
        get(target, prop) {
            if (typeof prop !== "string")
                return target[prop];
            if (prop in aliasMap)
                return target[aliasMap[prop]];
            if (prop === "corpus") {
                return { assessment_draft: target["audit_assessment_draft"] };
            }
            return target[prop];
        },
    });
    return compat;
}
exports.prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = exports.prisma;
}
exports.default = exports.prisma;
