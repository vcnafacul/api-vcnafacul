/**
 * Parse leve do User-Agent para exibir Browser, OS e Device.
 * Usado em frontend-errors (Discord) e em log_student (declaração de interesse).
 */

/** Extrai versão major (ex: "120") de string "120.0.0.0". */
export function majorVersion(ver: string): string {
  const n = ver.split('.')[0];
  return n ? `${n}` : ver;
}

export interface ParsedUserAgent {
  browser: string;
  os: string;
  device: string;
}

/** Parse leve do User-Agent para exibir Browser, OS e Device. */
export function parseUserAgentForDisplay(
  ua: string | undefined,
): ParsedUserAgent {
  if (!ua || typeof ua !== 'string')
    return { browser: '—', os: '—', device: '—' };
  const s = ua.toLowerCase();
  let browser = '—';
  if (s.includes('edg/')) {
    const v = ua.match(/edg\/([\d.]+)/i)?.[1] ?? '';
    browser = v ? `Edge ${majorVersion(v)}` : 'Edge';
  } else if (s.includes('opr/') || s.includes('opera')) {
    const v = ua.match(/(?:opr|opera)[/\s]([\d.]+)/i)?.[1] ?? '';
    browser = v ? `Opera ${majorVersion(v)}` : 'Opera';
  } else if (s.includes('chrome') && !s.includes('chromium')) {
    const v = ua.match(/chrome\/([\d.]+)/i)?.[1] ?? '';
    browser = v ? `Chrome ${majorVersion(v)}` : 'Chrome';
  } else if (s.includes('firefox')) {
    const v = ua.match(/firefox\/([\d.]+)/i)?.[1] ?? '';
    browser = v ? `Firefox ${majorVersion(v)}` : 'Firefox';
  } else if (s.includes('safari') && !s.includes('chrome')) {
    const v = ua.match(/version\/([\d.]+)/i)?.[1] ?? '';
    browser = v ? `Safari ${majorVersion(v)}` : 'Safari';
  } else if (s.includes('trident') || s.includes('msie')) browser = 'IE';

  let os = '—';
  if (s.includes('windows nt 10')) os = 'Windows 10/11';
  else if (s.includes('windows nt 6')) os = 'Windows 7/8';
  else if (s.includes('windows')) os = 'Windows';
  else if (s.includes('android')) {
    const v = ua.match(/android ([\d.]+)/i)?.[1] ?? '';
    os = v ? `Android ${majorVersion(v)}` : 'Android';
  } else if (s.includes('iphone') || s.includes('ipad')) os = 'iOS';
  else if (s.includes('mac os x') || s.includes('macintosh')) os = 'macOS';
  else if (s.includes('linux')) os = 'Linux';

  const device =
    s.includes('mobile') ||
    s.includes('android') ||
    s.includes('iphone') ||
    s.includes('ipad')
      ? 'mobile'
      : 'desktop';
  return { browser, os, device };
}
