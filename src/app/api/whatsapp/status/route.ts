export const dynamic = 'force-dynamic';

// ─── SQ Tech — WhatsApp Status & Control API ─────────────────────────────────
// GET  /api/whatsapp/status  → returns current connection status + QR + queue stats
// POST /api/whatsapp/status  → control actions: { action: 'connect' | 'disconnect' | 'reconnect' }

import { NextResponse } from 'next/server';
import { getStatus, getQr, isServerless, initClient, disconnectClient } from '@/lib/whatsapp';
import prisma from '@/lib/prisma';

// In-memory debug log ring buffer (last 100 entries, server lifetime)
const MAX_LOGS = 100;
export const debugLogs: string[] = [];

export function appendLog(msg: string) {
  const ts = new Date().toLocaleTimeString('en-PK', { hour12: true, timeZone: 'Asia/Karachi' });
  const entry = `[${ts}] ${msg}`;
  debugLogs.push(entry);
  if (debugLogs.length > MAX_LOGS) debugLogs.shift();
  console.log('[WA-LOG]', msg);
}

// Seed initial log
if (debugLogs.length === 0) {
  appendLog(
    isServerless()
      ? 'Platform: Serverless — WhatsApp direct client unavailable'
      : 'Platform: Persistent local server — WhatsApp client available',
  );
  appendLog(`Delivery mode: ${isServerless() ? 'wa.me deep links' : 'Direct WA client (whatsapp-web.js)'}`);
}

// ─── GET — Status poll ────────────────────────────────────────────────────────
export async function GET() {
  try {
    const serverless = isServerless();
    const status = getStatus();
    const qrCode  = serverless ? null : getQr();

    // Queue stats from DB
    let queueStats = { pending: 0, sent: 0, failed: 0 };
    try {
      const [pending, sent, failed] = await Promise.all([
        prisma.whatsappQueue.count({ where: { status: 'PENDING' } }),
        prisma.whatsappQueue.count({ where: { status: 'SENT' } }),
        prisma.whatsappQueue.count({ where: { status: 'FAILED' } }),
      ]);
      queueStats = { pending, sent, failed };
    } catch { /* DB may not be ready yet */ }

    appendLog(`Status poll → ${status} | queue: ${queueStats.pending} pending`);

    return NextResponse.json({
      mode: serverless ? 'serverless' : 'direct',
      status,
      qrCode,
      queueStats,
      logs: [...debugLogs].slice(-30), // last 30 for UI
      canConnect: !serverless && (status === 'DISCONNECTED' || status === 'RECONNECTING'),
      canDisconnect: !serverless && (status === 'CONNECTED' || status === 'QR_READY' || status === 'INITIALIZING'),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── POST — Control actions ───────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    if (isServerless()) {
      return NextResponse.json({
        error: 'WhatsApp client cannot run on serverless. Use wa.me deep links instead.',
        serverless: true,
      }, { status: 501 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    if (action === 'connect' || action === 'reconnect') {
      appendLog(`Action: ${action} triggered by admin`);
      // Run async — don't block the response (client.initialize() takes 30-60s)
      initClient().catch(e => appendLog(`Init error: ${e.message}`));
      return NextResponse.json({ success: true, message: 'WhatsApp client initializing — scan the QR code when it appears.' });
    }

    if (action === 'disconnect') {
      appendLog('Action: disconnect triggered by admin');
      await disconnectClient();
      return NextResponse.json({ success: true, message: 'WhatsApp client disconnected.' });
    }

    return NextResponse.json({ error: 'Invalid action. Use: connect | disconnect | reconnect' }, { status: 400 });
  } catch (error: any) {
    appendLog(`Control error: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
