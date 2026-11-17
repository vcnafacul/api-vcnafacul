/**
 * Roteamento de e-mail fora de produção: destinatários da whitelist saem
 * pelo SMTP "liberado", o resto continua no SMTP "bloqueado" (Mailpit).
 * Funções puras, sem Nest, para serem testadas sem SMTP.
 */

type Address = { name?: string; address: string };
type Recipient = string | Address;
type RecipientField = Recipient | Recipient[] | undefined;

const RECIPIENT_FIELDS = ['to', 'cc', 'bcc'] as const;

export type MailOptions = Record<string, unknown> & {
  from?: string | Address;
  to?: RecipientField;
  cc?: RecipientField;
  bcc?: RecipientField;
};

function toList(field: RecipientField): Recipient[] {
  if (!field) return [];
  const list = Array.isArray(field) ? field : [field];
  // "a@x.com, b@y.com" numa string só também é aceito pelo nodemailer
  return list.flatMap<Recipient>((r) =>
    typeof r === 'string'
      ? r
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [r],
  );
}

/** Endereço puro, em minúsculas: "Nome <a@x.com>" → "a@x.com". */
export function extractAddress(recipient: Recipient): string {
  const raw = typeof recipient === 'string' ? recipient : recipient.address;
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
}

/** Todos os endereços de to/cc/bcc, sem repetição. */
export function collectRecipients(options: MailOptions): string[] {
  const all = RECIPIENT_FIELDS.flatMap((f) => toList(options[f]));
  return [...new Set(all.map(extractAddress))];
}

/**
 * Separa a mensagem em duas: a dos destinatários liberados e a dos demais.
 * Cada lado é `null` quando não sobra nenhum destinatário para ele.
 */
export function splitByWhitelist(
  options: MailOptions,
  isReleased: (address: string) => boolean,
): { released: MailOptions | null; blocked: MailOptions | null } {
  const released: MailOptions = { ...options };
  const blocked: MailOptions = { ...options };
  let releasedCount = 0;
  let blockedCount = 0;

  for (const field of RECIPIENT_FIELDS) {
    const list = toList(options[field]);
    if (!list.length) continue;
    const yes = list.filter((r) => isReleased(extractAddress(r)));
    const no = list.filter((r) => !isReleased(extractAddress(r)));
    releasedCount += yes.length;
    blockedCount += no.length;
    if (yes.length) released[field] = yes;
    else delete released[field];
    if (no.length) blocked[field] = no;
    else delete blocked[field];
  }

  return {
    released: releasedCount ? released : null,
    blocked: blockedCount ? blocked : null,
  };
}

/** Troca o endereço do remetente mantendo o nome de exibição. */
export function replaceFromAddress(
  from: MailOptions['from'],
  address: string,
): string | Address {
  if (!from) return address;
  if (typeof from !== 'string') return { ...from, address };
  const match = from.match(/^(.*)<[^>]+>\s*$/);
  return match ? `${match[1]}<${address}>` : address;
}
