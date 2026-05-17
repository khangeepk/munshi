export const dynamic = 'force-dynamic';

// ─── SQ Tech — WhatsApp Send API ─────────────────────────────────────────────
// POST /api/whatsapp/send
// Body: { phone: string, message: string, caseId?: string, caseTitle?: string }
//
// Behavior:
//   - If WA client CONNECTED → send directly via whatsapp-web.js
//   - Otherwise → queue in DB + return wa.me link for manual delivery

import { NextResponse } from 'next/server';
import { getStatus, isServerless, buildWhatsAppLink, sendDirectMessage } from '@/lib/whatsapp';
import { appendLog } from '@/app/api/whatsapp/status/route';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, message, caseId, caseTitle } = body;

    if (!phone || !message) {
      return NextResponse.json({ error: 'phone and message are required' }, { status: 400 });
    }

    const waLink = buildWhatsAppLink(phone, message);

    // ── Always persist to queue ───────────────────────────────────────────────
    let queueId: string | null = null;
    try {
      const entry = await prisma.whatsappQueue.create({
        data: {
          phone,
          message,
          caseId: caseId ?? null,
          caseTitle: caseTitle ?? null,
          waLink,
          status: 'PENDING',
        },
      });
      queueId = entry.id;
      appendLog(`Queued: ${phone} (${entry.id.slice(0, 8)}…)`);
    } catch {
      appendLog('DB queue unavailable — proceeding without persistence');
    }

    // ── Serverless or disconnected → return wa.me link ────────────────────────
    const status = getStatus();
    if (isServerless() || status !== 'CONNECTED') {
      appendLog(`Fallback wa.me for ${phone} (status: ${status})`);
      return NextResponse.json({
        success: false,
        serverless: true,
        status,
        link: waLink,
        queueId,
        message: status === 'CONNECTED'
          ? 'Sent via wa.me link'
          : `WhatsApp ${status} — use the wa.me link or connect first`,
      });
    }

    // ── Direct send via whatsapp-web.js ───────────────────────────────────────
    try {
      await sendDirectMessage(phone, message);
      appendLog(`✅ Direct sent to ${phone}`);

      if (queueId) {
        await prisma.whatsappQueue.update({
          where: { id: queueId },
          data: { status: 'SENT', sentAt: new Date() },
        }).catch(() => {});
      }

      return NextResponse.json({ success: true, message: 'Message delivered via WhatsApp', queueId });
    } catch (sendErr: any) {
      appendLog(`❌ Direct send failed: ${sendErr.message}`);
      if (queueId) {
        await prisma.whatsappQueue.update({
          where: { id: queueId },
          data: { status: 'FAILED', error: sendErr.message },
        }).catch(() => {});
      }
      return NextResponse.json({
        success: false,
        error: sendErr.message,
        link: waLink,
        queueId,
      }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
