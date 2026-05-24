import { NextResponse } from 'next/server';
import prisma from '@/infrastructure/db/prisma/client';
import { getAuthContext } from '@/core/auth/auth-server';
import { resolveEffectiveCompanyId } from '@/infrastructure/db/prisma/resolveEffectiveCompanyId';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);

  try {
    const requestedCompanyId = (searchParams.get('company_id') || searchParams.get('companyId') || '').trim();
    const companyId = await resolveEffectiveCompanyId(UUID_REGEX.test(requestedCompanyId) ? requestedCompanyId : auth.tenantId);

    const processes = await prisma.elements.findMany({
      where: { company_id: companyId },
      include: { element_types: true, _count: { select: { activities: true } } },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({
      items: processes.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description ?? '',
        isActive: p.is_active,
        activitiesCount: p._count.activities,
        createdAt: p.created_at.toISOString(),
        updatedAt: p.updated_at.toISOString(),
        elementTypeName: p.element_types?.name ?? 'General',
        elementTypeCode: p.element_types?.code ?? 'GEN',
        elementTypeId: p.element_type_id,
        companyId: p.company_id,
        leaderId: p.leader_id,
      })),
    });
  } catch (error: unknown) {
    console.error('Error fetching governance processes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json() as {
      companyId: string;
      elementTypeId: string;
      leaderId?: string | null;
      code: string;
      name: string;
      description?: string;
      isActive?: boolean;
    };

    if (!body.companyId || !body.elementTypeId || !body.name || !body.code) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const created = await prisma.elements.create({
      data: {
        company_id: body.companyId,
        element_type_id: body.elementTypeId,
        leader_id: body.leaderId || null,
        code: body.code.trim(),
        name: body.name.trim(),
        description: body.description || null,
        is_active: body.isActive ?? true,
      },
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating process:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';
    if (!id) return NextResponse.json({ error: 'id es obligatorio' }, { status: 400 });

    const body = await request.json() as {
      elementTypeId?: string;
      leaderId?: string | null;
      code?: string;
      name?: string;
      description?: string;
      isActive?: boolean;
    };

    const updated = await prisma.elements.update({
      where: { id },
      data: {
        ...(body.elementTypeId !== undefined && { element_type_id: body.elementTypeId }),
        ...(body.leaderId !== undefined && { leader_id: body.leaderId || null }),
        ...(body.code !== undefined && { code: body.code.trim() }),
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.isActive !== undefined && { is_active: body.isActive }),
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ item: updated });
  } catch (error: unknown) {
    console.error('Error updating process:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';
    if (!id) return NextResponse.json({ error: 'id es obligatorio' }, { status: 400 });

    const [process, activitiesCount, incidentsCount] = await Promise.all([
      prisma.elements.findUnique({
        where: { id },
        select: { id: true, code: true, name: true, company_id: true },
      }),
      prisma.activities.count({ where: { element_id: id } }),
      prisma.incident_register.count({ where: { element_id: id } }),
    ]);

    if (!process) {
      return NextResponse.json({ error: 'El proceso no existe o ya fue eliminado.' }, { status: 404 });
    }

    const effectiveCompanyId = await resolveEffectiveCompanyId(auth.tenantId);
    if (process.company_id !== effectiveCompanyId) {
      return NextResponse.json({ error: 'No tiene acceso para eliminar este proceso.' }, { status: 403 });
    }

    if (activitiesCount > 0 || incidentsCount > 0) {
      const reasons: string[] = [];
      if (activitiesCount > 0) reasons.push(`${activitiesCount} actividad(es) vinculada(s)`);
      if (incidentsCount > 0) reasons.push(`${incidentsCount} incidente(s) vinculado(s)`);

      return NextResponse.json({
        error: `No se puede eliminar físicamente el proceso [${process.code}] ${process.name} porque tiene ${reasons.join(' y ')}.`,
      }, { status: 409 });
    }

    await prisma.elements.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('Error deleting process:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
