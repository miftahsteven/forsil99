import 'server-only';
import nodemailer, { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

// helper/email.ts

let transporter: Transporter | null = null;

export interface SendEmailParams {
    to: string | string[];
    subject: string;
    html?: string;        // HTML body (can include inline CSS / <script> though most clients block scripts)
    text?: string;        // Plain text fallback (auto-generated if absent)
    cc?: string | string[];
    bcc?: string | string[];
    replyTo?: string;
    attachments?: Array<{
        filename?: string;
        content?: string | Buffer;
        path?: string;
        contentType?: string;
        cid?: string;
    }>;
    headers?: Record<string, string>;
}

export interface SendEmailResult {
    messageId: string;
    accepted: Array<string | number>;
    rejected: Array<string | number>;
    pending: Array<string | number>;
    response: string;
    previewUrl?: string;
}

function getTransporter(): Transporter {
    if (transporter) return transporter;

    const {
        EMAIL_HOST,
        EMAIL_PORT,
        EMAIL_USER,
        EMAIL_PASS,
        EMAIL_SECURE,
        EMAIL_POOL,
    } = process.env;

    if (!EMAIL_HOST || !EMAIL_PORT) {
        throw new Error('Email transport variables (EMAIL_HOST, EMAIL_PORT) are required');
    }

    transporter = nodemailer.createTransport({
        host: EMAIL_HOST,
        port: Number(EMAIL_PORT),
        secure: EMAIL_SECURE === 'true' || Number(EMAIL_PORT) === 465,
        auth: EMAIL_USER && EMAIL_PASS ? { user: EMAIL_USER, pass: EMAIL_PASS } : undefined,
        pool: EMAIL_POOL === 'true',
    } as SMTPTransport.Options);

    // Optional verify in development
    if (process.env.NODE_ENV !== 'production') {
        transporter.verify().catch(err => {
            console.warn('[email] transporter verify failed:', err.message);
        });
    }

    return transporter;
}

function stripHtml(html: string): string {
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<\/(div|p|br|li|tr)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    const {
        to,
        subject,
        html,
        text,
        cc,
        bcc,
        replyTo,
        attachments,
        headers,
    } = params;

    if (!to) throw new Error('"to" is required');
    if (!subject) throw new Error('"subject" is required');
    if (!html && !text) throw new Error('Either "html" or "text" must be provided');

    const from =
        process.env.EMAIL_FROM ||
        (process.env.EMAIL_USER ? `No Reply <${process.env.EMAIL_USER}>` : undefined);

    if (!from) {
        throw new Error('EMAIL_FROM or EMAIL_USER must be set for the "from" address');
    }

    const mailOptions = {
        from,
        to,
        subject,
        html,
        text: text || (html ? stripHtml(html) : undefined),
        cc,
        bcc,
        replyTo,
        attachments,
        headers,
    };

    const info = await getTransporter().sendMail(mailOptions);

    let previewUrl: string | undefined;
    // Ethereal test account support
    try {
        const getTestMessageUrl = (nodemailer as any).getTestMessageUrl;
        if (getTestMessageUrl) {
            previewUrl = getTestMessageUrl(info) || undefined;
        }
    } catch {
        // ignore
    }

    return {
        messageId: info.messageId,
        accepted: info.accepted as any,
        rejected: info.rejected as any,
        pending: (info as any).pending || [],
        response: info.response,
        previewUrl,
    };
}

/**
 * Example usage:
 *
 * await sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Welcome',
 *   html: '<h1>Hello</h1><p>Welcome!</p>'
 * });
 */