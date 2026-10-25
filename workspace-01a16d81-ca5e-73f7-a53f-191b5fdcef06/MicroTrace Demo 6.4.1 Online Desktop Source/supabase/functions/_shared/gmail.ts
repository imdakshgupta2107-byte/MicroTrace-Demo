import { mimeMessage } from './core.ts';
export interface GmailConfig { clientId: string; clientSecret: string; refreshToken: string; sender: string }
export type DeliveryResult = { status: 'sent'; messageId: string } | { status: 'failed' | 'unknown' | 'retry'; code: string };
export async function oauthToken(config: GmailConfig, fetcher: typeof fetch = fetch): Promise<string> {
  const response = await fetcher('https://oauth2.googleapis.com/token', { method: 'POST', signal: AbortSignal.timeout(20_000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: config.refreshToken, grant_type: 'refresh_token' }) });
  if (!response.ok) throw new Error('GMAIL_AUTH_FAILED');
  const result = await response.json();
  if (typeof result.access_token !== 'string' || !result.access_token) throw new Error('GMAIL_AUTH_FAILED');
  return result.access_token;
}
/** Gmail has no transactional idempotency key. An uncertain POST is never blindly retried. */
export async function sendGmail(config: GmailConfig, token: string, message: Omit<Parameters<typeof mimeMessage>[0], 'from'>, fetcher: typeof fetch = fetch): Promise<DeliveryResult> {
  const raw = mimeMessage({ ...message, from: config.sender });
  let response: Response;
  try { response = await fetcher('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', signal: AbortSignal.timeout(20_000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw }) }); }
  catch { return { status: 'unknown', code: 'POST_OUTCOME_UNKNOWN_REVIEW_SENT_FOLDER' }; }
  if (response.ok) {
    try { const data = await response.json(); return typeof data.id === 'string' && data.id ? { status: 'sent', messageId: data.id } : { status: 'unknown', code: 'ACCEPTED_WITHOUT_MESSAGE_ID' }; }
    catch { return { status: 'unknown', code: 'ACCEPTED_RESPONSE_UNREADABLE' }; }
  }
  if (response.status === 429) return { status: 'retry', code: 'GMAIL_RATE_LIMITED' };
  if (response.status >= 500) return { status: 'unknown', code: 'GMAIL_SERVER_OUTCOME_UNCERTAIN' };
  return { status: 'failed', code: response.status === 401 || response.status === 403 ? 'GMAIL_PERMISSION_OR_QUOTA' : 'GMAIL_REJECTED_MESSAGE' };
}
