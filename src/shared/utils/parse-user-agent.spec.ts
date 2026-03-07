import {
  majorVersion,
  parseUserAgentForDisplay,
} from './parse-user-agent';

describe('majorVersion', () => {
  it('should return first segment of version string', () => {
    expect(majorVersion('120.0.0.0')).toBe('120');
    expect(majorVersion('1.2.3')).toBe('1');
  });

  it('should return full string when no dots', () => {
    expect(majorVersion('120')).toBe('120');
  });

  it('should return full string when first segment empty (no leading number)', () => {
    expect(majorVersion('.1.2')).toBe('.1.2');
  });
});

describe('parseUserAgentForDisplay', () => {
  it('should return placeholders for undefined', () => {
    const result = parseUserAgentForDisplay(undefined);
    expect(result).toEqual({ browser: '—', os: '—', device: '—' });
  });

  it('should return placeholders for non-string', () => {
    expect(parseUserAgentForDisplay(null as any)).toEqual({
      browser: '—',
      os: '—',
      device: '—',
    });
    expect(parseUserAgentForDisplay('')).toEqual({
      browser: '—',
      os: '—',
      device: '—',
    });
  });

  it('should detect Edge with version', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
    const result = parseUserAgentForDisplay(ua);
    expect(result.browser).toBe('Edge 120');
    expect(result.os).toBe('Windows 10/11');
    expect(result.device).toBe('desktop');
  });

  it('should detect Edge without version', () => {
    const result = parseUserAgentForDisplay('Something Edg/');
    expect(result.browser).toMatch(/Edge/);
  });

  it('should detect Opera with version', () => {
    const result = parseUserAgentForDisplay(
      'Mozilla/5.0 Opera/9.80 (Windows NT 6.0) Presto/2.12.388 Version/12.14',
    );
    expect(result.browser).toMatch(/Opera/);
  });

  it('should detect Chrome with version', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const result = parseUserAgentForDisplay(ua);
    expect(result.browser).toBe('Chrome 120');
    expect(result.os).toBe('Windows 10/11');
  });

  it('should detect Chrome without version', () => {
    const result = parseUserAgentForDisplay('Chrome something');
    expect(result.browser).toMatch(/Chrome/);
  });

  it('should detect Firefox with version', () => {
    const result = parseUserAgentForDisplay(
      'Mozilla/5.0 (Windows NT 10.0; rv:121.0) Gecko/20100101 Firefox/121.0',
    );
    expect(result.browser).toBe('Firefox 121');
  });

  it('should detect Firefox without version', () => {
    const result = parseUserAgentForDisplay('Firefox');
    expect(result.browser).toBe('Firefox');
  });

  it('should detect Safari with version', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/17.0 Safari/605.1.15';
    const result = parseUserAgentForDisplay(ua);
    expect(result.browser).toMatch(/Safari/);
  });

  it('should detect Safari without version', () => {
    const result = parseUserAgentForDisplay('Mozilla/5.0 (Macintosh) Safari/605.1');
    expect(result.browser).toBe('Safari');
  });

  it('should detect IE (Trident)', () => {
    const result = parseUserAgentForDisplay(
      'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)',
    );
    expect(result.browser).toBe('IE');
  });

  it('should detect IE (MSIE)', () => {
    const result = parseUserAgentForDisplay('Mozilla/4.0 (compatible; MSIE 8.0)');
    expect(result.browser).toBe('IE');
  });

  it('should detect Windows 10/11', () => {
    const result = parseUserAgentForDisplay(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    );
    expect(result.os).toBe('Windows 10/11');
  });

  it('should detect Windows 7/8', () => {
    const result = parseUserAgentForDisplay(
      'Mozilla/5.0 (Windows NT 6.1; WOW64)',
    );
    expect(result.os).toBe('Windows 7/8');
  });

  it('should detect generic Windows', () => {
    const result = parseUserAgentForDisplay('Mozilla/5.0 (Windows)');
    expect(result.os).toBe('Windows');
  });

  it('should detect Android with version', () => {
    const result = parseUserAgentForDisplay(
      'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36',
    );
    expect(result.os).toBe('Android 14');
    expect(result.device).toBe('mobile');
  });

  it('should detect Android without version', () => {
    const result = parseUserAgentForDisplay('Mozilla/5.0 (Android)');
    expect(result.os).toMatch(/Android/);
  });

  it('should detect iOS (iPhone)', () => {
    const result = parseUserAgentForDisplay(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    );
    expect(result.os).toBe('iOS');
    expect(result.device).toBe('mobile');
  });

  it('should detect iOS (iPad)', () => {
    const result = parseUserAgentForDisplay(
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',
    );
    expect(result.os).toBe('iOS');
    expect(result.device).toBe('mobile');
  });

  it('should detect macOS', () => {
    const result = parseUserAgentForDisplay(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    );
    expect(result.os).toBe('macOS');
  });

  it('should detect Linux', () => {
    const result = parseUserAgentForDisplay(
      'Mozilla/5.0 (X11; Linux x86_64)',
    );
    expect(result.os).toBe('Linux');
  });

  it('should detect mobile device by mobile keyword', () => {
    const result = parseUserAgentForDisplay(
      'Mozilla/5.0 (Linux; Android 10; Mobile)',
    );
    expect(result.device).toBe('mobile');
  });

  it('should return desktop when no mobile hints', () => {
    const result = parseUserAgentForDisplay(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0',
    );
    expect(result.device).toBe('desktop');
  });
});
