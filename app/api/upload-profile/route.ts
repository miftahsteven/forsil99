import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function ensureProfilesDir(): Promise<string> {
  const dir = path.join(process.cwd(), 'public', 'profiles');
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function deleteExistingProfileFiles(dir: string, id: string) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const targets = entries
      .filter((e) => e.isFile() && e.name.startsWith(`${id}.`))
      .map((e) => path.join(dir, e.name));
    await Promise.all(
      targets.map((p) =>
        fs.unlink(p).catch(() => {
          /* ignore missing or locked */
        })
      )
    );
  } catch {
    /* ignore */
  }
}

function sanitizeExt(filename: string | undefined): string {
  const original = filename || 'photo';
  const ext = original.includes('.') ? original.split('.').pop() : 'jpg';
  return (ext || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
}

async function saveProfileFile(id: string, file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = await ensureProfilesDir();
  await deleteExistingProfileFiles(dir, id); // hapus file lama dengan id yang sama

  const safeExt = sanitizeExt(file.name);
  const filePath = path.join(dir, `${id}.${safeExt}`);
  await fs.writeFile(filePath, bytes);

  return `/profiles/${id}.${safeExt}`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const id = formData.get('id');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'File missing' }, { status: 400 });
    }
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'id missing' }, { status: 400 });
    }

    const publicUrl = await saveProfileFile(id, file as File);
    return NextResponse.json({ success: true, url: publicUrl });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Upload profile error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const id = formData.get('id');

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'id missing' }, { status: 400 });
    }
    if (!file || typeof file === 'string') {
      return NextResponse.json({ success: false, error: 'File missing' }, { status: 400 });
    }

    const publicUrl = await saveProfileFile(id, file as File);
    return NextResponse.json({ success: true, url: publicUrl });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Upload profile error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}