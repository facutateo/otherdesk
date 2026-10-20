// Fake data layer. replica-backend swaps this file for Supabase calls with the same signatures,
// so no screen changes. Recents persist in localStorage so a real session shows up after it ends.
import { seedBooks, seedEntries, seedRecents } from "./seed";
import type { AddressBook, AddressBookEntry, DeviceOs, Recent } from "./types";

const RECENTS_KEY = "fake.recents";
const latency = () => new Promise((r) => setTimeout(r, 250)); // so loading states are visible in dev

function readRecents(): Recent[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as Recent[]) : seedRecents;
  } catch {
    return seedRecents;
  }
}

export async function listRecents(): Promise<Recent[]> {
  await latency();
  return [...readRecents()].sort((a, b) => b.connectedAt.localeCompare(a.connectedAt));
}

export async function addRecent(d: { id: string; name: string; os?: DeviceOs }): Promise<void> {
  const all = readRecents();
  const prev = all.find((r) => r.id === d.id);
  const list = all.filter((r) => r.id !== d.id);
  list.push({ id: d.id, name: d.name || prev?.name || "Equipo sin nombre", os: d.os ?? prev?.os ?? "windows",
    online: true, connectedAt: new Date().toISOString(), favorite: prev?.favorite ?? false });
  try { localStorage.setItem(RECENTS_KEY, JSON.stringify(list.slice(-50))); } catch { /* private mode: in-memory only */ }
}

export async function listAddressBooks(): Promise<AddressBook[]> {
  await latency();
  return seedBooks;
}

export async function listEntries(bookId: string): Promise<AddressBookEntry[]> {
  await latency();
  return seedEntries.filter((e) => e.bookId === bookId);
}
