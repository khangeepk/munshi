// src/services/notificationService.ts — SQ Tech Edition
// On serverless platforms (Netlify), direct WhatsApp send is not possible.
// The service gracefully falls back to wa.me deep links that open WhatsApp
// directly on the user's device with the message pre-filled.

export interface NotificationResult {
  success: boolean;
  deliveredAt?: Date;
  error?: string;
  /** On serverless: a wa.me link the user can click to open WhatsApp */
  link?: string;
  serverless?: boolean;
  queueId?: string;
}

/**
 * Build a wa.me deep link (works everywhere, including Netlify serverless).
 */
export function buildWaLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  // Auto-correct Pakistani 03xx numbers → 923xx
  const intl = digits.startsWith('03') && digits.length === 11
    ? '92' + digits.substring(1)
    : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

/**
 * Attempt to send a WhatsApp message.
 * On Netlify (serverless) the API returns a wa.me link — the caller
 * is responsible for opening it (window.open or anchor click).
 */
export const triggerAutomatedMessage = async (
  clientPhone: string,
  messagePayload: string,
  caseId?: string,
  caseTitle?: string
): Promise<NotificationResult> => {
  console.log(`[NotificationService] Dispatching to ${clientPhone}`);

  try {
    const res = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: clientPhone, message: messagePayload, caseId, caseTitle }),
    });

    const data = await res.json();

    // Serverless mode — API returned a wa.me link
    if (data?.serverless && data?.link) {
      console.log('[NotificationService] Serverless mode — opening WhatsApp link:', data.link);
      return { success: false, serverless: true, link: data.link, queueId: data.queueId };
    }

    if (!res.ok) {
      console.warn('[NotificationService] API failed:', data.error);
      // Fallback: generate link client-side
      const link = buildWaLink(clientPhone, messagePayload);
      return { success: false, error: data.error, link, serverless: true, queueId: data.queueId };
    }

    console.log('[NotificationService] Message sent successfully.');
    return { success: true, deliveredAt: new Date(), queueId: data.queueId };
  } catch (error: any) {
    console.error('[NotificationService] Network error:', error.message);
    // Always provide a fallback link
    const link = buildWaLink(clientPhone, messagePayload);
    return { success: false, error: error.message, link, serverless: true };
  }
};
