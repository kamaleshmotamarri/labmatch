'use client';
import { useAuth } from '@clerk/nextjs';
import { createContext, useContext, useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { deleteSwipe, fetchProfile, fetchSwipes, saveProfile, saveSwipe } from '@/lib/client-api';
import { emptyProfile, professors, type StudentProfile, type DiscoveryDecision, type ChatMessage, type EmailDraft } from '@/lib/data';

type State = { profile: StudentProfile; decisions: DiscoveryDecision[]; chat: ChatMessage[]; drafts: EmailDraft[] };
const initial: State = { profile: emptyProfile, decisions: [], chat: [], drafts: [] };
const KEY_PREFIX = 'labmatch:v2:';
const Context = createContext<{ state: State; setState: (updater: (s: State) => State) => void; ready: boolean; storageError: boolean } | null>(null);

function storageKey(userId: string) {
  return `${KEY_PREFIX}${userId}`;
}

function valid(value: unknown): value is State {
  if (!value || typeof value !== 'object') return false;
  const s = value as State;
  const p = s.profile;
  return !!p
    && ['name', 'major', 'year', 'coursework', 'skills', 'goals'].every((k) => typeof p[k as keyof StudentProfile] === 'string')
    && Array.isArray(p.interests)
    && p.interests.every((t) => typeof t === 'string')
    && Array.isArray(s.decisions)
    && s.decisions.every((d) => d && professors.some((prof) => prof.id === d.professorId) && ['saved', 'passed'].includes(d.action))
    && Array.isArray(s.chat)
    && s.chat.every((m) => m && ['user', 'assistant'].includes(m.role) && typeof m.text === 'string')
    && Array.isArray(s.drafts)
    && s.drafts.every((d) => d && professors.some((prof) => prof.id === d.professorId) && typeof d.subject === 'string' && typeof d.body === 'string');
}

type Snapshot = { state: State; ready: boolean; storageError: boolean; userId: string | null };
const serverSnapshot: Snapshot = { state: initial, ready: false, storageError: false, userId: null };
let snapshot = serverSnapshot;
let lastSavedProfileJson = JSON.stringify(emptyProfile);
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function emit() {
  listeners.forEach((notify) => notify());
}

function loadLocal(userId: string | null): { state: State; storageError: boolean } {
  if (!userId) return { state: initial, storageError: false };
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (valid(parsed)) return { state: parsed, storageError: false };
    }
  } catch {
    return { state: initial, storageError: true };
  }
  return { state: initial, storageError: false };
}

function persistLocal(userId: string | null, state: State) {
  if (!userId) return false;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
    return false;
  } catch {
    return true;
  }
}

function setSnapshot(next: Snapshot) {
  snapshot = next;
  emit();
}

function setState(updater: (s: State) => State) {
  const state = updater(snapshot.state);
  const storageError = persistLocal(snapshot.userId, state) || snapshot.storageError;
  snapshot = { ...snapshot, state, ready: true, storageError };
  emit();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);
  const { isLoaded, isSignedIn, userId } = useAuth();
  const activeUserId = isLoaded && isSignedIn ? userId ?? null : isLoaded ? null : undefined;
  const profileTimer = useRef<number | null>(null);

  useEffect(() => {
    if (activeUserId === undefined) return;

    if (profileTimer.current) {
      window.clearTimeout(profileTimer.current);
      profileTimer.current = null;
    }

    if (!activeUserId) {
      lastSavedProfileJson = JSON.stringify(emptyProfile);
      setSnapshot({ state: initial, ready: true, storageError: false, userId: null });
      return;
    }

    const local = loadLocal(activeUserId);
    lastSavedProfileJson = JSON.stringify(local.state.profile);
    setSnapshot({ state: local.state, ready: false, storageError: local.storageError, userId: activeUserId });

    let cancelled = false;
    void (async () => {
      try {
        const [remoteProfile, remoteSwipes] = await Promise.all([fetchProfile(), fetchSwipes()]);
        if (cancelled || snapshot.userId !== activeUserId) return;
        const next: State = {
          ...local.state,
          profile: remoteProfile?.profile ?? local.state.profile,
          decisions: remoteSwipes?.decisions ?? local.state.decisions,
        };
        lastSavedProfileJson = JSON.stringify(next.profile);
        const storageError = persistLocal(activeUserId, next) || local.storageError;
        setSnapshot({ state: next, ready: true, storageError, userId: activeUserId });
      } catch {
        if (cancelled || snapshot.userId !== activeUserId) return;
        setSnapshot({ state: local.state, ready: true, storageError: local.storageError, userId: activeUserId });
      }
    })();

    return () => {
      cancelled = true;
      if (profileTimer.current) {
        window.clearTimeout(profileTimer.current);
        profileTimer.current = null;
      }
    };
  }, [activeUserId]);

  useEffect(() => {
    if (!value.ready || !value.userId || value.userId !== activeUserId) return;
    const serialized = JSON.stringify(value.state.profile);
    if (serialized === lastSavedProfileJson) return;
    if (profileTimer.current) window.clearTimeout(profileTimer.current);
    profileTimer.current = window.setTimeout(() => {
      lastSavedProfileJson = serialized;
      void saveProfile(value.state.profile).catch(() => {
        lastSavedProfileJson = '';
      });
    }, 500);
    return () => {
      if (profileTimer.current) window.clearTimeout(profileTimer.current);
    };
  }, [activeUserId, value.ready, value.userId, value.state.profile]);

  return <Context.Provider value={{ ...value, setState }}>{children}</Context.Provider>;
}

export async function persistDecision(decision: DiscoveryDecision) {
  try { await saveSwipe(decision); } catch { /* local copy still saved */ }
}

export async function persistDecisionRemoval(professorId?: string) {
  try { await deleteSwipe(professorId); } catch { /* local copy still updated */ }
}

export async function persistProfile(profile?: StudentProfile) {
  const next = profile ?? snapshot.state.profile;
  lastSavedProfileJson = JSON.stringify(next);
  try { await saveProfile(next); } catch { /* local copy still saved */ }
}

export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error('StoreProvider required');
  return value;
}
