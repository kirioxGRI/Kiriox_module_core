import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/infrastructure/db/prisma/client';
import { Prisma } from '@/generated/prisma/client';
import { getAuthContext } from '@/core/auth/auth-server';

export async function GET(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const sp = request.nextUrl.searchParams;
    const companyId = sp.get('company_id') || '';
    const page = Math.max(1, Number(sp.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, Number(sp.get('limit') || '10')));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (companyId) where.company_id = companyId;

    const [items, total] = await Promise.all([
      prisma.activities.findMany({
        where,
        include: {
          elements: { select: { id: true, name: true, code: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.activities.count({ where }),
    ]);

    // Resolve owner names
    const ownerIds = [...new Set(items.map(i => i.owner_id).filter(Boolean))] as string[];
    const owners = ownerIds.length > 0
      ? await prisma.security_users.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, name: true, last_name: true, email: true },
        })
      : [];
    const ownerMap = new Map(owners.map(o => [o.id, o]));

    const mapped = items.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description,
      code: a.code,
      isActive: a.is_active,
      companyId: a.company_id,
      elementId: a.element_id,
      ownerId: a.owner_id,
      ownerName: a.owner_id ? (() => {
        const o = ownerMap.get(a.owner_id);
        return o ? [o.name, o.last_name].filter(Boolean).join(' ') || o.email : null;
      })() : null,
      processName: a.elements?.name ?? null,
      processCode: a.elements?.code ?? null,
      createdAt: a.created_at,
    }));

    return NextResponse.json({ items: mapped, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error: unknown) {
    console.error('Error listing activities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function buildUniqueActivityCode(name: string): Promise<string> {
  const seed = name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '').replace(/_+/g, '_').slice(0, 40) || 'ACT';

  const rows = await prisma.$queryRaw<{ code: string }[]>(Prisma.sql`
    SELECT code FROM public.activities
    WHERE code = ${seed} OR code LIKE ${`${seed}_%`}
  `);

  const existing = new Set(rows.map(r => r.code));
  if (!existing.has(seed)) return seed;
  let suffix = 2;
  while (existing.has(`${seed}_${suffix}`)) suffix++;
  return `${seed}_${suffix}`;
}

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json() as {
      companyId?: string; elementId?: string; name?: string;
      description?: string; isActive?: boolean; ownerId?: string;
    };

    const companyId = String(body.companyId ?? '').trim();
    const elementId = String(body.elementId ?? '').trim();
    const name = String(body.name ?? '').trim();

    if (!companyId || !elementId || !name) {
      return NextResponse.json({ error: 'companyId, elementId y name son obligatorios' }, { status: 400 });
    }

    const code = await buildUniqueActivityCode(name);

    const act = await prisma.activities.create({
      data: {
        company_id: companyId,
        element_id: elementId,
        code,
        name,
        description: body.description ?? null,
        is_active: body.isActive !== false,
        owner_id: body.ownerId || null,
      },
    });

    return NextResponse.json({ item: act }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const id = request.nextUrl.searchParams.get('id') || '';
    if (!id) return NextResponse.json({ error: 'id es obligatorio' }, { status: 400 });

    const body = await request.json() as {
      name?: string;
      description?: string;
      isActive?: boolean;
      elementId?: string;
      ownerId?: string | null;
    };

    const updated = await prisma.activities.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.isActive !== undefined && { is_active: body.isActive }),
        ...(body.elementId !== undefined && { element_id: body.elementId }),
        ...(body.ownerId !== undefined && { owner_id: body.ownerId || null }),
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ item: updated });
  } catch (error: unknown) {
    console.error('Error updating activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const id = request.nextUrl.searchParams.get('id') || '';
    if (!id) return NextResponse.json({ error: 'id es obligatorio' }, { status: 400 });

    await prisma.activities.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('Error deleting activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
