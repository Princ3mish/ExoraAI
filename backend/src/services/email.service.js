import { Resend } from 'resend';
import logger from '../utils/logger.js';
import { logEvent } from '../utils/logEvent.js';

/**
 * Email Service — Resend SDK.
 * All sends are fire-and-forget; failures NEVER propagate to callers.
 *
 * Configure via .env:
 *   RESEND_API_KEY        — your Resend API key
 *   RESEND_FROM_ADDRESS   — verified domain sender, e.g. "Exora <exora@princemishra.me>"
 */

if (!process.env.RESEND_API_KEY) {
  logger.warn('[EmailService] RESEND_API_KEY not configured — email sending disabled');
}

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_ADDRESS =
  process.env.RESEND_FROM_ADDRESS || 'Exora <exora@princemishra.me>';

// ─── Shared HTML layout helpers ───────────────────────────────────────────────

const htmlWrapper = (bodyContent) => `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#6366F1;padding:20px 40px;text-align:center;">
              <table align="center" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <!-- Inline logo icon representing Exora AI -->
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 48 46" style="display:block;width:32px;height:32px;">
                      <path fill="#ffffff" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
                    </svg>
                  </td>
                  <td style="vertical-align:middle;text-align:left;">
                    <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;line-height:1.1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">Exora AI</p>
                    <p style="margin:2px 0 0;font-size:11px;color:rgba(255,255,255,0.85);letter-spacing:0.2px;line-height:1.1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;text-transform:uppercase;font-weight:600;">Your AI Meeting Assistant</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;background-color:#F5F0E8;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#78716C;line-height:1.5;">
                &copy; 2026 Exora AI &mdash; Your AI-Powered Meeting Assistant
              </p>
              <p style="margin:0;font-size:12px;color:#78716C;line-height:1.5;">
                This email was sent by Exora AI on behalf of your meeting organizer.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const detailsBox = (rows) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fb;border-radius:8px;padding:20px;margin:20px 0;">
    ${rows.map(([label, value]) => `
    <tr>
      <td style="padding:6px 0;font-size:13px;color:#6b7280;width:140px;vertical-align:top;">${label}</td>
      <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:500;">${value}</td>
    </tr>`).join('')}
  </table>`;

// ─── Low-level send (used by sendEmail / sendBulkEmail) ───────────────────────

/**
 * Send an HTML email via Resend.
 * @param {object} opts
 * @param {string} opts.to
 * @param {string} opts.subject
 * @param {string} opts.html      - Full HTML string
 * @param {string} [opts.text]    - Optional plain-text fallback
 * @param {string} [opts.meetingId]
 * @param {string} [opts.userId]
 */
async function _send({ to, subject, html, text, meetingId, userId }) {
  if (!resend) {
    await logEvent({
      type: 'ERROR',
      message: `Email skipped for ${to}: RESEND_API_KEY not configured`,
      status: 'failed',
      meetingId,
      userId,
      metadata: { to },
    });
    return;
  }

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
    });

    // Surface Resend validation errors returned in the response body (non-throwing)
    if (result.error) {
      throw new Error(`Resend API error: ${result.error.message} (${result.error.name})`);
    }

    await logEvent({
      type: 'AI_ACTION',
      message: `Email sent to ${to}`,
      status: 'success',
      meetingId,
      userId,
      metadata: { to, subject },
    });

    logger.info(`[EmailService] Sent to ${to}`, { to, subject, meetingId });
  } catch (err) {
    await logEvent({
      type: 'ERROR',
      message: `Email failed for ${to}: ${err.message}`,
      status: 'failed',
      meetingId,
      userId,
      metadata: { to, error: err.message },
    });

    logger.error(`[EmailService] Failed to send to ${to}`, { error: err.message });
    // Never rethrow — caller must not crash on email failure
  }
}


// ─── Generic helpers (kept for backward compatibility with existing callers) ──

/**
 * Send a plain-text email to a single recipient.
 * Existing callers (messageHandler, meetings.service) use this via sendBulkEmail.
 * @param {object} opts
 * @param {string} opts.to
 * @param {string} opts.subject
 * @param {string} opts.body       - Plain text body (wrapped in minimal HTML)
 * @param {string} [opts.meetingId]
 * @param {string} [opts.userId]
 */
export async function sendEmail({ to, subject, body, meetingId, userId }) {
  const html = htmlWrapper(`
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">${body.replace(/\n/g, '<br>')}</p>
  `);
  await _send({ to, subject, html, text: body, meetingId, userId });
}

/**
 * Send emails to multiple recipients concurrently.
 * Each individual failure is logged without blocking others.
 * @param {object} opts
 * @param {Array<{email: string, userId: string}>} opts.recipients
 * @param {string} opts.subject
 * @param {string} opts.body
 * @param {string} [opts.meetingId]
 */
export async function sendBulkEmail({ recipients, subject, body, meetingId }) {
  await Promise.allSettled(
    recipients.map(({ email, userId }) =>
      sendEmail({ to: email, subject, body, meetingId, userId })
    )
  );
}

// ─── Meeting-specific email helpers ──────────────────────────────────────────

/**
 * Send a meeting invitation email.
 * @param {string} to
 * @param {object} opts
 * @param {string} opts.name
 * @param {string} opts.meetingTitle
 * @param {string} opts.meetingTime    - Pre-formatted date/time string
 * @param {string} opts.organizerName
 * @param {string} opts.meetingId
 */
export async function sendMeetingInvite(to, { name, meetingTitle, meetingTime, organizerName, meetingId }) {
  const subject = `Meeting invite: ${meetingTitle}`;

  const html = htmlWrapper(`
    <h1 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700;">You've been invited to a meeting</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Hi ${name || 'there'},</p>

    <h2 style="margin:0 0 4px;font-size:20px;color:#6366F1;font-weight:700;">${meetingTitle}</h2>

    ${detailsBox([
      ['📅 Date & Time', meetingTime],
      ['👤 Organizer', organizerName],
    ])}

    <p style="margin:20px 0 0;font-size:14px;color:#374151;line-height:1.6;">
      Got it — no action needed right now. You'll hear from us before the meeting starts.
    </p>
  `);

  try {
    await _send({ to, subject, html, meetingId });
    logger.info('[EmailService] Sent invite', { to, meetingTitle });
    return { success: true };
  } catch (err) {
    logger.error('[EmailService] Failed', { to, error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Send a meeting confirmation email.
 * @param {string} to
 * @param {object} opts
 * @param {string}   opts.name
 * @param {string}   opts.meetingTitle
 * @param {string}   opts.meetingTime
 * @param {string[]} opts.agendaTopics
 */
export async function sendMeetingConfirmation(to, { name, meetingTitle, meetingTime, agendaTopics }) {
  const subject = `Confirmed: ${meetingTitle}`;

  const agendaHtml = agendaTopics && agendaTopics.length > 0
    ? `<ul style="margin:8px 0 0;padding-left:20px;font-size:14px;color:#374151;line-height:1.8;">
        ${agendaTopics.map((t) => `<li>${t}</li>`).join('')}
      </ul>`
    : `<p style="margin:4px 0 0;font-size:14px;color:#6b7280;">No agenda topics yet.</p>`;

  const html = htmlWrapper(`
    <h1 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700;">Your meeting is confirmed ✓</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Hi ${name || 'there'},</p>

    <h2 style="margin:0 0 4px;font-size:20px;color:#6366F1;font-weight:700;">${meetingTitle}</h2>

    ${detailsBox([
      ['📅 Date & Time', meetingTime],
    ])}

    <div style="margin:20px 0 0;">
      <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#374151;">Agenda Topics</p>
      ${agendaHtml}
    </div>
  `);

  try {
    await _send({ to, subject, html });
    logger.info('[EmailService] Sent confirmation', { to, meetingTitle });
    return { success: true };
  } catch (err) {
    logger.error('[EmailService] Failed', { to, error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Send a meeting cancellation email.
 * @param {string} to
 * @param {object} opts
 * @param {string} opts.name
 * @param {string} opts.meetingTitle
 * @param {string} opts.meetingTime
 */
export async function sendMeetingCancellation(to, { name, meetingTitle, meetingTime }) {
  const subject = `Cancelled: ${meetingTitle}`;

  const html = htmlWrapper(`
    <h1 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700;">Meeting Cancelled</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Hi ${name || 'there'},</p>

    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
      We're sorry to let you know that the following meeting has been cancelled:
    </p>

    <h2 style="margin:0 0 4px;font-size:20px;color:#6366F1;font-weight:700;">${meetingTitle}</h2>

    ${detailsBox([
      ['📅 Was scheduled for', meetingTime],
    ])}

    <p style="margin:20px 0 0;font-size:14px;color:#374151;line-height:1.6;">
      If you have any questions, please contact the meeting organizer directly.
    </p>
  `);

  try {
    await _send({ to, subject, html });
    logger.info('[EmailService] Sent cancellation', { to, meetingTitle });
    return { success: true };
  } catch (err) {
    logger.error('[EmailService] Failed', { to, error: err.message });
    return { success: false, error: err.message };
  }
}
