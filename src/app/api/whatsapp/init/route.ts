export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initClient, isServerless, getStatus } from '@/lib/whatsapp';
import { appendLog } from '@/app/api/whatsapp/status/route';

export async function POST() {
  if (isServerless()) {
    return NextResponse.json({
      success: false,
      serverless: true,
      message: 'WhatsApp web client cannot run on Netlify/serverless. Use the WhatsApp direct link feature instead.',
    }, { status: 501 });
  }

  const current = getStatus();
  if (current === 'CONNECTED') {
    return NextResponse.json({ success: true, message: 'Already connected', status: current });
  }

  appendLog('Manual init triggered from admin panel');
  // Non-blocking — client initialization takes 30-60s
  initClient().catch(e => appendLog(`Init error: ${e.message}`));

  return NextResponse.json({
    success: true,
    message: 'WhatsApp initialization started. A QR code will appear shortly — scan it with WhatsApp on your phone.',
    status: 'INITIALIZING',
  });
}
