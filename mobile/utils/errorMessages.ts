const NETWORK_PATTERNS = [
  { pattern: /network error/i, message: 'Unable to connect. Please check your internet connection.' },
  { pattern: /timeout/i, message: 'The request timed out. Please try again.' },
  { pattern: /ECONNREFUSED/i, message: 'Unable to reach our servers. Please try again later.' },
  { pattern: /ENOTFOUND/i, message: 'Unable to connect. Please check your internet connection.' },
  { pattern: /status code 500/i, message: 'Something went wrong on our end. Please try again.' },
  { pattern: /status code 502/i, message: 'Our servers are temporarily unavailable. Please try again.' },
  { pattern: /status code 503/i, message: 'Service temporarily unavailable. Please try again later.' },
  { pattern: /status code 429/i, message: 'Too many requests. Please wait a moment and try again.' },
];

export function errorToUserMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!err) return fallback;

  const axiosErr = err as any;
  const serverDetail = axiosErr?.response?.data?.detail;

  if (typeof serverDetail === 'string' && serverDetail.length < 200) {
    return serverDetail;
  }

  if (Array.isArray(serverDetail) && serverDetail.length > 0) {
    const msg = serverDetail[0]?.msg;
    if (typeof msg === 'string' && msg.length < 200) {
      return msg.replace(/^Value error,\s*/i, '');
    }
  }

  const rawMessage = axiosErr?.message ?? String(err);

  for (const { pattern, message } of NETWORK_PATTERNS) {
    if (pattern.test(rawMessage)) return message;
  }

  return fallback;
}
