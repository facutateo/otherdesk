import type { AddressBook, AddressBookEntry, Recent } from "./types";

// Synthetic data so screens have something real to show. Ids are made up.
export const seedRecents: Recent[] = [
  { id: "481203957", name: "Oficina-Recepción", os: "windows", online: true, connectedAt: "2026-10-20T09:12:00Z", favorite: true },
  { id: "730114862", name: "Mac-Diseño", os: "macos", online: false, lastSeenAt: "2026-10-20T06:40:00Z", connectedAt: "2026-10-19T16:03:00Z", favorite: false },
  { id: "295847310", name: "Servidor-Backups", os: "linux", online: true, connectedAt: "2026-10-18T22:30:00Z", favorite: true },
  { id: "604918273", name: "Portátil de ventas con un nombre larguísimo para probar el truncado", os: "windows", online: false, lastSeenAt: "2026-10-12T10:00:00Z", connectedAt: "2026-10-12T09:55:00Z", favorite: false },
];

export const seedBooks: AddressBook[] = [
  { id: "book-clientes", name: "Clientes" },
  { id: "book-interno", name: "Equipos internos" },
];

export const seedEntries: AddressBookEntry[] = [
  { id: "e1", bookId: "book-clientes", address: "481203957", displayName: "Clínica Norte · Recepción", tags: ["clínica", "windows"], favorite: true, os: "windows", online: true },
  { id: "e2", bookId: "book-clientes", address: "caja-1@ferreteria", displayName: "Ferretería López · Caja 1", tags: ["tienda"], favorite: false, os: "windows", online: false },
  { id: "e3", bookId: "book-clientes", address: "730114862", displayName: "Estudio Ámbar · Mac de diseño", tags: ["diseño", "mac"], favorite: false, os: "macos", online: false },
  { id: "e4", bookId: "book-clientes", address: "158392046", displayName: "Asesoría Pérez y Asociados · Equipo de la sala de reuniones", tags: ["asesoría"], favorite: false, os: "windows", online: true },
  { id: "e5", bookId: "book-interno", address: "295847310", displayName: "Servidor de copias", tags: ["servidor", "linux"], favorite: true, os: "linux", online: true },
];
