import 'server-only';
import nodemailer from 'nodemailer';
import { NextRequest, NextResponse } from 'next/server';

export interface SendEmailInput {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    : undefined,
    tls: { rejectUnauthorized: false }
});

async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  return transporter.sendMail({
    from: process.env.EMAIL_FROM || 'No Reply <no-reply@example.com>',
    to,
    subject,
    html,
    text,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, html, text } = body || {};
    if (!to || !subject || (!html && !text)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload' },
        { status: 400 }
      );
    }
    await sendEmail({ to, subject, html, text });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 }
    );
  }
}