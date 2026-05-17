export const dynamic = 'force-dynamic';

// GET /api/whatsapp/qr — returns QR code as a base64 data URL for display in UI
import { NextResponse } from 'next/server';
import { getQr, getStatus } from '@/lib/whatsapp';
import QRCode from 'qrcode';

export async function GET() {
  const qrString = getQr();
  const status = getStatus();

  if (!qrString) {
    return NextResponse.json({ qrCode: null, status });
  }

  try {
    const dataUrl = await QRCode.toDataURL(qrString, {
      width: 300,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
    return NextResponse.json({ qrCode: dataUrl, status });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
