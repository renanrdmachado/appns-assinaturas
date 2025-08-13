/**
 * Extrai o IP real do cliente a partir do objeto Request do Express.
 * Prioriza X-Forwarded-For (primeiro IP), depois req.ip/remoteAddress.
 * Remove prefixo IPv6 ::ffff: e retorna IPv4 quando possível.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function getClientIp(req) {
  try {
    const xff = req.headers?.['x-forwarded-for'];
    let ip;

    if (xff) {
      const first = Array.isArray(xff) ? xff[0] : xff.split(',')[0];
      ip = (first || '').trim();
    }

    if (!ip) {
      ip = req.socket?.remoteAddress
        || req.ip
        || null;
    }

    if (!ip) return null;

    // Se vier lista separada por vírgula por algum motivo
    if (ip.includes(',')) ip = ip.split(',')[0].trim();

    // Remover prefixo IPv6 mapeado para IPv4
    if (ip.startsWith('::ffff:')) ip = ip.slice(7);

    // Tentar padronizar para IPv4 quando presente na string
    const m = ip.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/);
    if (m) return m[0];

    return ip;
  } catch (_) {
    return null;
  }
}

module.exports = { getClientIp };
