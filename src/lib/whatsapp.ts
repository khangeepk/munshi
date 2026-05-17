// ─── SQ Tech — WhatsApp Integration Module ────────────────────────────────────
// Uses whatsapp-web.js with Puppeteer/Chromium for local persistent server.
// Falls back to wa.me deep links on serverless platforms (Vercel/Netlify).
//
// STATUS LIFECYCLE:
//   DISCONNECTED → initClient() → INITIALIZING → QR emitted → QR_READY
//   → admin scans QR → CONNECTED
//   → disconnected event → DISCONNECTED (auto-reconnect after 10s)

import path from 'path';

const IS_SERVERLESS =
  process.env.NETLIFY === 'true' ||
  process.env.VERCEL === '1' ||
  process.env.AWS_LAMBDA_FUNCTION_NAME != null;

// Allow force-enable for local dev even without WHATSAPP_ENABLED
const IS_LOCAL = !IS_SERVERLESS;

type WAStatus = 'DISCONNECTED' | 'INITIALIZING' | 'QR_READY' | 'CONNECTED' | 'RECONNECTING' | 'SERVERLESS';

// Globals survive hot-reload in Next.js dev because they live on globalThis
declare global {
  var __waStatus: WAStatus;
  var __waQr: string | null;
  var __waClient: any;
  var __waInitializing: boolean;
  var __waReconnectTimer: ReturnType<typeof setTimeout> | null;
}

if (!globalThis.__waStatus)        globalThis.__waStatus = 'DISCONNECTED';
if (globalThis.__waQr === undefined) globalThis.__waQr = null;
if (!globalThis.__waInitializing)  globalThis.__waInitializing = false;
if (!globalThis.__waReconnectTimer) globalThis.__waReconnectTimer = null;

export const getStatus = (): WAStatus => IS_SERVERLESS ? 'SERVERLESS' : globalThis.__waStatus;
export const getQr = () => globalThis.__waQr;
export const isServerless = () => IS_SERVERLESS;
export const getClient = () => globalThis.__waClient ?? null;

// ─── Phone number normalizer ──────────────────────────────────────────────────
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Pakistani 03xx (11 digits) → 923xx
  if (digits.startsWith('03') && digits.length === 11) return '92' + digits.substring(1);
  // 3xx (10 digits) → 923xx
  if (digits.startsWith('3') && digits.length === 10) return '92' + digits;
  return digits;
}

// ─── wa.me deep link builder (works everywhere) ───────────────────────────────
export function buildWhatsAppLink(phone: string, message: string): string {
  const normalized = normalizePhone(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

// ─── Direct message sender (requires active client) ──────────────────────────
export async function sendDirectMessage(phone: string, message: string): Promise<void> {
  const client = globalThis.__waClient;
  if (!client) throw new Error('WhatsApp client not initialized');
  if (globalThis.__waStatus !== 'CONNECTED') throw new Error(`WhatsApp not connected (status: ${globalThis.__waStatus})`);
  const chatId = `${normalizePhone(phone)}@c.us`;
  await client.sendMessage(chatId, message);
}

// ─── Initialize whatsapp-web.js client ───────────────────────────────────────
export const initClient = async (): Promise<void> => {
  if (IS_SERVERLESS) throw new Error('Cannot start WhatsApp client on serverless platform.');
  if (globalThis.__waInitializing) { console.log('[WA] Already initializing, skipping.'); return; }
  if (globalThis.__waStatus === 'CONNECTED') { console.log('[WA] Already connected.'); return; }

  globalThis.__waInitializing = true;
  globalThis.__waStatus = 'INITIALIZING';
  globalThis.__waQr = null;

  console.log('[WA] Starting whatsapp-web.js client...');

  try {
    const { Client, LocalAuth } = await import('whatsapp-web.js');

    // Destroy old client if exists
    if (globalThis.__waClient) {
      try { await globalThis.__waClient.destroy(); } catch { /* ignore */ }
      globalThis.__waClient = null;
    }

    const sessionPath = path.resolve(process.cwd(), '.wwebjs_auth');

    const client = new Client({
      authStrategy: new LocalAuth({ dataPath: sessionPath }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    });

    client.on('qr', (qr: string) => {
      console.log('[WA] QR Code generated — scan with WhatsApp');
      globalThis.__waQr = qr;
      globalThis.__waStatus = 'QR_READY';
    });

    client.on('authenticated', () => {
      console.log('[WA] Authenticated successfully');
      globalThis.__waQr = null;
    });

    client.on('ready', () => {
      console.log('[WA] ✅ WhatsApp CONNECTED');
      globalThis.__waQr = null;
      globalThis.__waStatus = 'CONNECTED';
      globalThis.__waInitializing = false;
    });

    client.on('auth_failure', (msg: string) => {
      console.error('[WA] Auth failure:', msg);
      globalThis.__waStatus = 'DISCONNECTED';
      globalThis.__waQr = null;
      globalThis.__waInitializing = false;
    });

    client.on('disconnected', (reason: string) => {
      console.warn('[WA] Disconnected:', reason);
      globalThis.__waStatus = 'DISCONNECTED';
      globalThis.__waQr = null;
      globalThis.__waClient = null;
      globalThis.__waInitializing = false;

      // Auto-reconnect after 15 seconds
      if (globalThis.__waReconnectTimer) clearTimeout(globalThis.__waReconnectTimer);
      globalThis.__waReconnectTimer = setTimeout(() => {
        console.log('[WA] Auto-reconnecting...');
        globalThis.__waStatus = 'RECONNECTING';
        initClient().catch(e => console.error('[WA] Reconnect failed:', e.message));
      }, 15_000);
    });

    globalThis.__waClient = client;
    await client.initialize();
  } catch (err: any) {
    console.error('[WA] Init error:', err.message);
    globalThis.__waStatus = 'DISCONNECTED';
    globalThis.__waInitializing = false;
    throw err;
  }
};

// ─── Graceful disconnect ──────────────────────────────────────────────────────
export const disconnectClient = async (): Promise<void> => {
  if (globalThis.__waReconnectTimer) {
    clearTimeout(globalThis.__waReconnectTimer);
    globalThis.__waReconnectTimer = null;
  }
  if (globalThis.__waClient) {
    try { await globalThis.__waClient.destroy(); } catch { /* ignore */ }
    globalThis.__waClient = null;
  }
  globalThis.__waStatus = 'DISCONNECTED';
  globalThis.__waQr = null;
  globalThis.__waInitializing = false;
  console.log('[WA] Client disconnected gracefully.');
};
