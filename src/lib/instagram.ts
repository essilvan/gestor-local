/**
 * Utilitário para formatação e manipulação de perfis e handles do Instagram
 */

export function sanitizeInstagramHandle(input?: string | null): string | null {
  if (!input) return null;
  let clean = input.trim();
  clean = clean.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
  clean = clean.replace(/[/?#].*$/, "");
  clean = clean.replace(/^@/, "");
  clean = clean.trim();
  return clean.length > 0 ? clean : null;
}

export function getInstagramProfileUrl(handle?: string | null): string | null {
  const clean = sanitizeInstagramHandle(handle);
  return clean ? `https://instagram.com/${clean}` : null;
}

/**
 * Extrai instagram de um prospect lendo a coluna ou fallback no campo notes
 */
export function resolveProspectInstagram(p: any): string | null {
  if (p?.instagram && typeof p.instagram === "string" && p.instagram.trim()) {
    return sanitizeInstagramHandle(p.instagram);
  }
  if (p?.notes && typeof p.notes === "string") {
    try {
      const parsed = JSON.parse(p.notes);
      if (parsed.instagram) return sanitizeInstagramHandle(parsed.instagram);
    } catch {
      const match = p.notes.match(/instagram:\s*([^\s,;]+)/i);
      if (match) return sanitizeInstagramHandle(match[1]);
    }
  }
  return null;
}
