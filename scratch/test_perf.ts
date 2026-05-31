import prisma from '../src/infrastructure/db/prisma/client';
import { resolveEffectiveCompanyId } from '../src/infrastructure/db/prisma/resolveEffectiveCompanyId';

async function main() {
  const companyId = '05cb4cc6-c215-4d41-84b3-98c6013cda27';
  console.log('Finding active user for company:', companyId);

  const realUser = await prisma.security_users.findFirst({
    where: { company_id: companyId, is_active: { not: false } },
    select: { id: true, email: true }
  });

  if (!realUser) {
    console.log('No user found');
    process.exit(0);
  }

  const targetUserId = realUser.id;
  console.log(`Testing with user: ${realUser.email} (${targetUserId})`);

  let start = performance.now();
  const resolvedCompanyId = await resolveEffectiveCompanyId(companyId);
  console.log(`resolveEffectiveCompanyId took: ${(performance.now() - start).toFixed(2)} ms`);

  start = performance.now();
  const company = await prisma.company.findUnique({
    where: { id: resolvedCompanyId },
    select: { id: true, code: true, name: true },
  });
  console.log(`loadCompany took: ${(performance.now() - start).toFixed(2)} ms`);

  start = performance.now();
  const user = await prisma.security_users.findUnique({
    where: { id: targetUserId },
    select: { id: true, username: true, name: true, last_name: true, email: true },
  });
  console.log(`loadUser took: ${(performance.now() - start).toFixed(2)} ms`);

  start = performance.now();
  const modules = await prisma.security_module.findMany({
    where: { company_id: resolvedCompanyId, is_active: true },
    select: { code: true },
  });
  console.log(`getEnabledModules took: ${(performance.now() - start).toFixed(2)} ms`);

  start = performance.now();
  const userRoles = await prisma.security_users.findFirst({
    where: { id: targetUserId, company_id: resolvedCompanyId, is_active: { not: false } },
    select: {
      map_user_x_roles: {
        where: {
          is_active: true,
          security_roles: { is_active: true },
        },
        select: {
          security_roles: { select: { id: true, code: true, name: true } },
        },
      },
    },
  });
  console.log(`loadActiveRoles took: ${(performance.now() - start).toFixed(2)} ms`);

  start = performance.now();
  const userAccess = await prisma.security_users.findFirst({
    where: { id: targetUserId, company_id: resolvedCompanyId, is_active: { not: false } },
    select: {
      map_user_x_roles: {
        where: {
          is_active: true,
          security_roles: { is_active: true },
        },
        select: {
          security_roles: {
            select: {
              map_role_x_module_x_permissions: {
                where: {
                  is_active: true,
                  security_module: { company_id: resolvedCompanyId, is_active: true },
                },
                select: {
                  security_module: { select: { id: true, code: true, name: true } },
                  security_permissions: { select: { code: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  console.log(`loadModuleAccess took: ${(performance.now() - start).toFixed(2)} ms`);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
