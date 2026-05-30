import { NextResponse } from 'next/server';
import { getAuthContext } from '@/core/auth/auth-server';
import { getServerAccessContext } from '@/core/permissions/server/getServerAccessContext';

export async function GET() {
  const auth = await getAuthContext();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await getServerAccessContext();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(access, { status: 200 });
}
