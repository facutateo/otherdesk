// Remote address = numeric ID (9-10 digits) or alias name@namespace (recon: help "ID and Alias").
const ALIAS = /^[a-z0-9._-]{1,25}@[a-z0-9][a-z0-9-]{1,30}$/;

export type Address = { kind: "id"; id: string } | { kind: "alias"; alias: string };

/** "123 456 789" — groups of 3 from the left, as the user reads it aloud. */
export function formatId(id: string): string {
  return id.replace(/\D/g, "").replace(/(\d{3})(?=\d)/g, "$1 ");
}

/** For screen readers: "1 2 3, 4 5 6, 7 8 9" instead of "one hundred twenty-three million". */
export function spokenId(id: string): string {
  return formatId(id).split(" ").map((g) => g.split("").join(" ")).join(", ");
}

/** Parses what the user typed or pasted. Returns null when it is neither an ID nor an alias. */
export function parseAddress(raw: string): Address | null {
  const s = raw.trim().toLowerCase();
  const digits = s.replace(/[\s-]/g, "");
  if (/^\d{9,10}$/.test(digits)) return { kind: "id", id: digits };
  if (ALIAS.test(s)) return { kind: "alias", alias: s };
  return null;
}
