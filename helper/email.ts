import 'server-only';
import nodemailer, { type SentMessageInfo } from 'nodemailer';

// HAPUS blok require('resend') lama

export type EmailProvider = 'smtp' | 'resend';

export interface SendEmailInput {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
}

export interface SendEmailResult {
    success: boolean;
    provider: EmailProvider;
    messageId?: string;
    error?: string;
}

// Tipe minimal Resend (tanpa dependensi langsung)
type ResendSendArgs = {
    from: string;
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
};
type ResendSendResp =
    | { data: { id: string }; error: null }
    | { data: null; error: { message: string } };

type ResendClient = {
    emails: { send: (args: ResendSendArgs) => Promise<ResendSendResp> };
};

function isResendClient(v: unknown): v is ResendClient {
    if (typeof v !== 'object' || v === null) return false;
    const emails = (v as { emails?: unknown }).emails;
    return typeof emails === 'object' && emails !== null &&
        typeof (emails as { send?: unknown }).send === 'function';
}

let resendClientPromise: Promise<ResendClient | null> | null = null;
async function getResendClient(): Promise<ResendClient | null> {
    if ((process.env.EMAIL_PROVIDER || '').toLowerCase() !== 'resend') return null;
    if (resendClientPromise) return resendClientPromise;

    resendClientPromise = (async () => {
        try {
            const apiKey = process.env.RESEND_API_KEY;
            if (!apiKey) return null;
            const mod = await import('resend'); // dynamic import, bukan require
            const clientUnknown = new mod.Resend(apiKey) as unknown;
            return isResendClient(clientUnknown) ? clientUnknown : null;
        } catch {
            return null;
        }
    })();

    return resendClientPromise;
}

function getProvider(): EmailProvider {
    return (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase() === 'resend' ? 'resend' : 'smtp';
}

function createSMTPTransport() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host) throw new Error('SMTP_HOST is not set');

    return nodemailer.createTransport({
        host, port, secure,
        auth: user && pass ? { user, pass } : undefined,
    });
}

async function sendViaSMTP(input: SendEmailInput): Promise<SendEmailResult> {
    const transporter = createSMTPTransport();
    const info: SentMessageInfo = await transporter.sendMail({
        from: input.from || process.env.EMAIL_FROM || 'No Reply <no-reply@example.com>',
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
    });
    return { success: true, provider: 'smtp', messageId: info.messageId };
}

async function sendViaResend(input: SendEmailInput): Promise<SendEmailResult> {
    const client = await getResendClient();
    if (!client) {
        return { success: false, provider: 'resend', error: 'Resend client not available (install resend and set RESEND_API_KEY)' };
    }
    const from = input.from || process.env.EMAIL_FROM;
    if (!from) return { success: false, provider: 'resend', error: 'EMAIL_FROM is not set' };

    const resp = await client.emails.send({
        from, to: input.to, subject: input.subject, html: input.html, text: input.text,
    });
    if ('error' in resp && resp.error) {
        return { success: false, provider: 'resend', error: resp.error.message };
    }
    return { success: true, provider: 'resend', messageId: resp.data.id };
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    try {
        if (!input.to || !input.subject || (!input.html && !input.text)) {
            return { success: false, provider: getProvider(), error: 'Invalid payload' };
        }
        return getProvider() === 'resend' ? await sendViaResend(input) : await sendViaSMTP(input);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, provider: getProvider(), error: message };
    }
}