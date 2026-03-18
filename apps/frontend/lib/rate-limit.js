/**
 * Simple in-memory rate limiter for API routes.
 * Note: This resets on serverless function cold starts.
 * For production at scale, use Redis (e.g. Upstash).
 */
function rateLimit({ interval = 60000, limit = 30 } = {}) {
  const tokenCache = new Map();

  // Cleanup stale entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of tokenCache) {
      if (now > val.resetAt) tokenCache.delete(key);
    }
  }, interval);

  return {
    check(token) {
      const now = Date.now();
      let entry = tokenCache.get(token);
      if (!entry || now > entry.resetAt) {
        entry = { count: 0, resetAt: now + interval };
        tokenCache.set(token, entry);
      }
      entry.count++;
      return entry.count <= limit;
    },
  };
}

module.exports = { rateLimit };
