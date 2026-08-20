import type { Request, Response, NextFunction } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStores = new Map<string, Map<string, RateLimitRecord>>();

/**
 * High-performance, zero-dependency in-memory sliding rate limiter.
 * Protects against brute-force attacks, credential stuffing, and API flooding.
 */
export function rateLimit(options: RateLimitOptions) {
  const storeKey = `${options.windowMs}_${options.max}`;
  if (!rateLimitStores.has(storeKey)) {
    rateLimitStores.set(storeKey, new Map());
  }
  const store = rateLimitStores.get(storeKey)!;

  // Periodic cleanup of expired rate limit records every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = options.keyGenerator
      ? options.keyGenerator(req)
      : (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket.remoteAddress ||
        "unknown";

    const now = Date.now();
    let record = store.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      store.set(key, record);
    } else {
      record.count++;
    }

    const remaining = Math.max(0, options.max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader("X-RateLimit-Limit", options.max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetSeconds);

    if (record.count > options.max) {
      res.setHeader("Retry-After", resetSeconds);
      res.status(429).json({
        error: "rate_limit_exceeded",
        message: options.message || "Too many requests. Please slow down and try again shortly.",
        retryAfter: resetSeconds,
      });
      return;
    }

    next();
  };
}

/**
 * OWASP Recommended Security Headers Middleware.
 * Hardens the application against Clickjacking, MIME sniffing, and XSS.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }

  next();
}
