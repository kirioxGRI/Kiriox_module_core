"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveEffectiveCompanyId = void 0;
const react_1 = require("react");
const client_1 = require("./client");
// cache() deduplicates calls with the same argument within a single RSC request render.
exports.resolveEffectiveCompanyId = (0, react_1.cache)(async (companyId) => {
    const requestedId = String(companyId ?? "").trim();
    const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    try {
        if (UUID_PATTERN.test(requestedId)) {
            const company = await client_1.default.company.findUnique({
                where: { id: requestedId },
                select: { id: true },
            });
            if (company?.id)
                return company.id;
        }
        const fallback = await client_1.default.company.findFirst({
            orderBy: [{ name: "asc" }, { id: "asc" }],
            select: { id: true },
        });
        if (fallback?.id)
            return fallback.id;
    }
    catch (err) {
        const code = err?.code;
        if (code === "ETIMEDOUT" || code === "ECONNREFUSED" || code === "ENOTFOUND") {
            throw new Error("No hay conexión con la base de datos. Verifique que el servidor esté disponible.");
        }
        throw err;
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedId)) {
        return requestedId;
    }
    throw new Error("No se pudo resolver la empresa efectiva del sistema.");
});
