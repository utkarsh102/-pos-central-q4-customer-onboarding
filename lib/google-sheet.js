async function callScript(payload) {
  const url = process.env.APPS_SCRIPT_URL;
  const secret = process.env.SHEET_WRITE_SECRET;
  if (!url || !secret) throw new Error('Google Sheet write connection is not configured.');
  if (!/^https:\/\/script\.google\.com\/macros\/s\//.test(url)) throw new Error('Google Apps Script URL is invalid.');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...payload, secret }),
    redirect: 'follow',
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('Google Sheet connection failed.');
  const result = await response.json().catch(() => null);
  if (!result || result.ok !== true) throw new Error(result?.error || 'Google Sheet rejected the request.');
  return result;
}

module.exports = { callScript };
