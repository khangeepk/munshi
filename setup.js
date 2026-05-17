const fs = require('fs');
const path = require('path');

const files = {
  'src/app/api/cases/route.ts': `import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const cases = await prisma.case.findMany({
      where: status ? { status: status as any } : undefined,
      include: { lawyer: { select: { name: true, email: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json(cases, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newCase = await prisma.case.create({
      data: { ...body, submissionDate: new Date(body.submissionDate), status: 'FILED' }
    });
    return NextResponse.json(newCase, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}`,
  
  'src/app/api/reminders/route.ts': `import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const nextWeek = new Date(now); nextWeek.setDate(nextWeek.getDate() + 7);
    
    const upcoming = await prisma.case.findMany({
      where: { nextHearingDate: { gte: now, lte: nextWeek }, status: { notIn: ['CLOSED', 'ORDER_RESERVED'] } },
      orderBy: { nextHearingDate: 'asc' }
    });
    return NextResponse.json({ urgent: upcoming.slice(0, 3), upcoming, total: upcoming.length }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}`,

  'src/hooks/useReminders.ts': `'use client';
import { useEffect, useState } from 'react';

export function useReminders() {
  const [reminders, setReminders] = useState({ urgent: [], upcoming: [], total: 0 });
  useEffect(() => {
    fetch('/api/reminders').then(r => r.json()).then(setReminders);
  }, []);
  return { reminders };
}`,
  
  'src/app/page.tsx': `import Link from 'next/link';

export default function Dashboard() {
  return (
    <div className="space-y-8 p-8">
      <h1 className="text-3xl font-bold text-slate-900">Case Management Dashboard</h1>
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow border">Active Cases<br/><b className="text-2xl text-blue-600">24</b></div>
        <div className="bg-white p-6 rounded-xl shadow border">Upcoming Hearings<br/><b className="text-2xl text-amber-600">5</b></div>
      </div>
      <Link href="/cases" className="text-blue-600 underline mt-4 inline-block">Go to Cases Directory &rarr;</Link>
    </div>
  );
}`
};

Object.entries(files).forEach(([filepath, content]) => {
  const fullPath = path.join(__dirname, filepath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
});
console.log('Setup script complete.');
