import type { NextFunction, Request, Response } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
}

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit({ windowMs, max, message }: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const forwarded = req.header("x-forwarded-for")?.split(",")[0]?.trim();
    const ip = forwarded || req.ip || req.socket.remoteAddress || "unknown";
    const key = `${req.method}:${req.path}:${ip}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= max) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({ error: message });
    }

    bucket.count += 1;
    return next();
  };
}
