'use client';
import { useAuth } from '@clerk/nextjs';
import { createContext, useContext, useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { deleteSwipe, fetchSwipes, saveSwipe, saveSwipes } from '@/lib/client-api';
import { emptyProfile, professors, type StudentProfile, type DiscoveryDecision, type ChatMessage, type EmailDraft } from '@/lib/data';
type State = { profile: StudentProfile; decisions: DiscoveryDecision[]; chat: ChatMessage[]; drafts: EmailDraft[] };
const initial: State = { profile: emptyProfile, decisions: [], chat: [], drafts: [] };
const KEY = 'labmatch:v2';
const Context = createContext<{ state: State; setState: (updater: (s: State) => State) => void; ready: boolean; storageError: boolean } | null>(null);
function valid(value: unknown): value is State {
 if (!value || typeof value !== 'object') return false;
 const s = value as State; const p = s.profile;
 return !!p && ['name','major','year','coursework','skills','goals'].every(k => typeof p[k as keyof StudentProfile] === 'string') && Array.isArray(p.interests) && p.interests.every(t => typeof t === 'string') && Array.isArray(s.decisions) && s.decisions.every(d => d && professors.some(p => p.id === d.professorId) && ['saved','passed'].includes(d.action)) && Array.isArray(s.chat) && s.chat.every(m => m && ['user','assistant'].includes(m.role) && typeof m.text === 'string') && Array.isArray(s.drafts) && s.drafts.every(d => d && professors.some(p => p.id === d.professorId) && typeof d.subject === 'string' && typeof d.body === 'string');
}
type Snapshot = { state: State; ready: boolean; storageError: boolean };
const serverSnapshot: Snapshot = { state: initial, ready: false, storageError: false };
let snapshot = serverSnapshot;
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
 listeners.add(listener);
 if (!snapshot.ready) {
  let state = initial; let storageError = false;
  try { const raw = localStorage.getItem(KEY); if (raw) { const parsed: unknown = JSON.parse(raw); if (valid(parsed)) state = parsed; } } catch { storageError = true; }
  snapshot = { state, ready: true, storageError };
  listeners.forEach(notify => notify());
 }
 return () => { listeners.delete(listener); };
}
function setState(updater: (s: State) => State) {
 const state = updater(snapshot.state); let storageError = snapshot.storageError;
 try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { storageError = true; }
 snapshot = { state, ready: true, storageError };
 listeners.forEach(notify => notify());
}
export function StoreProvider({ children }: { children: ReactNode }) {
 const value = useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);
 const { isSignedIn } = useAuth();
 const synced = useRef(false);
 useEffect(() => {
  if (!isSignedIn || !value.ready || synced.current) return;
  synced.current = true;
  void (async () => {
   try {
    const remote = await fetchSwipes();
    if (!remote) return;
    const localOnly = snapshot.state.decisions.filter((decision) => !remote.decisions.some((item) => item.professorId === decision.professorId));
    const merged = localOnly.length ? await saveSwipes(localOnly) : remote;
    if (merged) setState((state) => ({ ...state, decisions: merged.decisions }));
   } catch {
    synced.current = false;
   }
  })();
 }, [isSignedIn, value.ready]);
 return <Context.Provider value={{...value,setState}}>{children}</Context.Provider>;
}

export async function persistDecision(decision: DiscoveryDecision) {
 try { await saveSwipe(decision); } catch { /* local copy still saved */ }
}

export async function persistDecisionRemoval(professorId?: string) {
 try { await deleteSwipe(professorId); } catch { /* local copy still updated */ }
}
export function useStore() { const value = useContext(Context); if(!value) throw new Error('StoreProvider required'); return value; }
