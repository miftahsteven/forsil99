import 'server-only';
import nodemailer, { type SentMessageInfo } from 'nodemailer';

// Opsional: pakai Resend via HTTP (bukan SMTP)
let ResendClass: { new(apiKey: string): { emails: { send: (args: ResendSendArgs) => Promise<ResendSendResp> } } } | null = null;
try {
    // Hindari error bundling jika package belum di-install
    // npm i resend
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ResendClass = require('resend').Resend as typeof ResendClass;
} catch {
    ResendClass = null;
}

export type EmailProvider = 'smtp' | 'resend';

export interface SendEmailInput {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string; // override EMAIL_FROM bila perlu
}

export interface SendEmailResult {
    success: boolean;
    provider: EmailProvider;
    messageId?: string;
    error?: string;
}

// Tipe minimal respon Resend (menghindari any)
type ResendSendArgs = {
    from: string;
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
};

type ResendSendResp =
    | { data: { id: string }; error: null }
    | { data: null; error: { message: string; name?: string } };

function getProvider(): EmailProvider {
    const p = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();
    return p === 'resend' ? 'resend' : 'smtp';
}

function createSMTPTransport() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host) throw new Error('SMTP_HOST is not set');

    const transport = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user && pass ? { user, pass } : undefined,
    });

    return transport;
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
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return { success: false, provider: 'resend', error: 'RESEND_API_KEY is not set' };
    }
    if (!ResendClass) {
        return { success: false, provider: 'resend', error: 'resend package is not installed' };
    }

    const resend = new ResendClass(apiKey);
    const from = input.from || process.env.EMAIL_FROM;
    if (!from) {
        return { success: false, provider: 'resend', error: 'EMAIL_FROM is not set' };
    }

    const resp = await resend.emails.send({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
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

        const provider = getProvider();
        if (provider === 'resend') {
            return await sendViaResend(input);
        }
        return await sendViaSMTP(input);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, provider: getProvider(), error: message };
    }
}