"use client";

import type { ChatMessage, Role, UploadedDocument, WorkspaceId } from "./types";

const ROLE_KEY = "nasdaq-demo-role";
const UPLOADS_KEY = "nasdaq-demo-uploads";
const CHATS_KEY = "nasdaq-demo-chats";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getStoredRole(): Role | null {
  if (typeof window === "undefined") return null;
  return safeParse<Role | null>(localStorage.getItem(ROLE_KEY), null);
}

export function setStoredRole(role: Role): void {
  localStorage.setItem(ROLE_KEY, JSON.stringify(role));
}

export function clearStoredRole(): void {
  localStorage.removeItem(ROLE_KEY);
}

export function getUploads(workspaceId: WorkspaceId): UploadedDocument[] {
  if (typeof window === "undefined") return [];
  const all = safeParse<UploadedDocument[]>(
    localStorage.getItem(UPLOADS_KEY),
    [],
  );
  return all.filter((d) => d.workspaceId === workspaceId);
}

export function addUpload(doc: UploadedDocument): void {
  const all = safeParse<UploadedDocument[]>(
    localStorage.getItem(UPLOADS_KEY),
    [],
  );
  all.unshift(doc);
  localStorage.setItem(UPLOADS_KEY, JSON.stringify(all));
}

export function getChat(workspaceId: WorkspaceId): ChatMessage[] {
  if (typeof window === "undefined") return [];
  const all = safeParse<Record<string, ChatMessage[]>>(
    localStorage.getItem(CHATS_KEY),
    {},
  );
  return all[workspaceId] ?? [];
}

export function setChat(workspaceId: WorkspaceId, messages: ChatMessage[]): void {
  const all = safeParse<Record<string, ChatMessage[]>>(
    localStorage.getItem(CHATS_KEY),
    {},
  );
  all[workspaceId] = messages;
  localStorage.setItem(CHATS_KEY, JSON.stringify(all));
}
