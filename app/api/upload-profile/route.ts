import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export const runtime = 'nodejs';          // pastikan Node (bukan Edge)
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const id = formData.get('id'); // id firebase (key) yang Anda kirim
    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'File missing' }, { status: 400 });
    }
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'id missing' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    // Ekstensi sederhana
    const original = (file as File).name || 'photo';
    const ext = original.includes('.') ? original.split('.').pop() : 'jpg';
    const safeExt = (ext || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';

    const dir = path.join(process.cwd(), 'public', 'profiles');
    await fs.mkdir(dir, { recursive: true });

    const filePath = path.join(dir, `${id}.${safeExt}`);
    await fs.writeFile(filePath, bytes);

    const publicUrl = `/profiles/${id}.${safeExt}`;
    return NextResponse.json({ success: true, url: publicUrl });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Upload profile error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}