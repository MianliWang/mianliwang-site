import { createHash } from "node:crypto";
import { isIP } from "node:net";

const TRUSTED_IP_HEADERS = [
  "x-vercel-forwarded-for",
  "cf-connecting-ip",
  "x-real-ip",
] as const;

function normalizeIpToken(value: string): string | null {
  const token = value.trim();
  if (!token) {
    return null;
  }

  const bracketedIpv6 = token.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketedIpv6 && isIP(bracketedIpv6[1])) {
    return bracketedIpv6[1];
  }

  if (isIP(token)) {
    return token;
  }

  const ipv4WithPort = token.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4WithPort && isIP(ipv4WithPort[1])) {
    return ipv4WithPort[1];
  }

  return null;
}

function parsePossiblyForwardedHeader(value: string): string | null {
  const candidates = value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const parsed = normalizeIpToken(candidate);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function buildFallbackIdentifier(request: Request): string {
  const fingerprint = [
    request.headers.get("user-agent") ?? "",
    request.headers.get("accept-language") ?? "",
    request.headers.get("sec-ch-ua-platform") ?? "",
    request.headers.get("host") ?? "",
  ].join("|");

  const digest = createHash("sha256")
    .update(fingerprint)
    .digest("hex")
    .slice(0, 20);

  return `fp:${digest}`;
}

export function resolveClientIdentifier(request: Request) {
  for (const header of TRUSTED_IP_HEADERS) {
    const headerValue = request.headers.get(header);
    if (!headerValue) {
      continue;
    }

    const ip = parsePossiblyForwardedHeader(headerValue);
    if (ip) {
      return `ip:${ip}`;
    }
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = parsePossiblyForwardedHeader(forwarded);
    if (ip) {
      return `ip:${ip}`;
    }
  }

  return buildFallbackIdentifier(request);
}
