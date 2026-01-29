const URL_WITH_PROTOCOL = /^https?:\/\//i;
const SPECIAL_PROTOCOLS = /^(data:|blob:)/i;
const RELATIVE_PATH = /^(\.?\/|\/)/;
const DOMAIN_LIKE = /^[\w-]+(\.[\w-]+)+/;

export function normalizeImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (URL_WITH_PROTOCOL.test(trimmed)) return trimmed;
  if (SPECIAL_PROTOCOLS.test(trimmed)) return trimmed;
  if (RELATIVE_PATH.test(trimmed)) return trimmed;

  if (DOMAIN_LIKE.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}
