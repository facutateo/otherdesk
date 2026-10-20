export type DeviceOs = "windows" | "macos" | "linux";

export interface DeviceRef {
  id: string;            // numeric id, digits only
  name: string;
  os: DeviceOs;
  online: boolean;
  lastSeenAt?: string;   // ISO, UTC
}

export interface Recent extends DeviceRef { connectedAt: string; favorite: boolean }

export interface AddressBook { id: string; name: string }

export interface AddressBookEntry {
  id: string;
  bookId: string;
  address: string;       // numeric id or alias
  displayName: string;
  tags: string[];
  favorite: boolean;
  os: DeviceOs;
  online: boolean;
}
