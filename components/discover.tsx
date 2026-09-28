'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Card, Detail } from './professor-card';
import { persistDecision, persistDecisionRemoval, useStore } from './store';
import {
  colleges,
  departments,
  departmentsFor,
  ranked,
  topics,
  type CollegeId,
  type Professor,
} from '@/lib/data';

function resolveCollege(value: string | null): CollegeId {
  return value?.toUpperCase() === 'CBS' ? 'CBS' : 'CSE';
}

function resolveDepartment(college: CollegeId, value: string | null) {
  const available = departmentsFor(college);
  return available.find((department) => department.id === value?.toLowerCase())?.id || available.find((department) => department.ready)?.id || available[0].id;
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function SwipeDeck({
  current,
  upcoming,
  onDecide,
  onDetails,
}: {
  current: Professor;
  upcoming: Professor[];
  onDecide: (id: string, action: 'saved' | 'passed') => void;
  onDetails: () => void;
}) {
  const startX = useRef<number | null>(null);
  const dragX = useRef(0);
  const front = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<{ professor: Professor; dir: 'left' | 'right'; x: number } | null>(null);

  function applyDrag(x: number) {
    dragX.current = x;
    const node = front.current;
    if (!node) return;
    node.style.transform = `translateX(${x}px) rotate(${x / 18}deg)`;
    node.classList.toggle('is-pass', x < -40);
    node.classList.toggle('is-save', x > 40);
  }

  function commit(action: 'saved' | 'passed') {
    const outgoing = current;
    const dir = action === 'saved' ? 'right' : 'left';
    const x = dragX.current;
    startX.current = null;
    dragX.current = 0;
    setDragging(false);
    if (!prefersReducedMotion()) setLeaving({ professor: outgoing, dir, x });
    onDecide(outgoing.id, action);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('button, a')) return;
    startX.current = event.clientX;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (startX.current === null) return;
    applyDrag(event.clientX - startX.current);
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (startX.current === null) return;
    const delta = event.clientX - startX.current;
    startX.current = null;
    setDragging(false);
    if (Math.abs(delta) > 85) {
      commit(delta > 0 ? 'saved' : 'passed');
      return;
    }
    applyDrag(0);
  }

  return (
    <div className="swipe-stage">
      <div
        className={`deck${dragging ? ' is-dragging' : ''}`}
        tabIndex={0}
        aria-label="Professor deck. Swipe or use the left arrow to pass and the right arrow to save."
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            commit('passed');
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            commit('saved');
          }
        }}
      >
        <div className="deck-ghost two" aria-hidden="true">
          {upcoming[1] ? <img src={upcoming[1].photo} alt="" /> : null}
        </div>
        {!upcoming[0] ? <div className="deck-ghost one" aria-hidden="true" /> : null}
        {leaving ? (
          <div
            className={`deck-leaving ${leaving.dir}`}
            style={{ '--from-x': `${leaving.x}px`, '--from-r': `${leaving.x / 18}deg` } as CSSProperties}
            onAnimationEnd={() => setLeaving((card) => (card?.professor.id === leaving.professor.id ? null : card))}
            aria-hidden="true"
          >
            <Card p={leaving.professor} onDetails={onDetails} compact />
          </div>
        ) : null}
        {[current, upcoming[0]].filter((professor): professor is Professor => !!professor).map((professor, index) => (
          <div
            key={professor.id}
            ref={index === 0 ? front : undefined}
            className={index === 0 ? 'deck-front' : 'deck-ready'}
            aria-hidden={index !== 0}
            onPointerDown={index === 0 ? onPointerDown : undefined}
            onPointerMove={index === 0 ? onPointerMove : undefined}
            onPointerUp={index === 0 ? onPointerUp : undefined}
            onPointerCancel={index === 0 ? () => {
              startX.current = null;
              setDragging(false);
              applyDrag(0);
            } : undefined}
          >
            {index === 0 ? (
              <>
                <span className="swipe-stamp pass" aria-hidden="true">Pass</span>
                <span className="swipe-stamp save" aria-hidden="true">Save</span>
              </>
            ) : null}
            <Card p={professor} onDetails={onDetails} compact priority />
          </div>
        ))}
      </div>
      <div className="swipe-actions">
        <button className="round-button" type="button" onClick={() => commit('passed')} aria-label="Pass professor">
          ×
        </button>
        <button className="round-button info" type="button" onClick={onDetails} aria-label="View professor details">
          i
        </button>
        <button className="round-button heart" type="button" onClick={() => commit('saved')} aria-label="Save professor">
          ♡
        </button>
      </div>
      <div className="swipe-action-labels" aria-hidden="true">
        <span>Pass</span>
        <span>Details</span>
        <span>Save</span>
      </div>
      <p className="discover-hint">Drag the card, or use ← to pass and → to save.</p>
    </div>
  );
}

export function Discover() {
  const params = useSearchParams();
  const router = useRouter();
  const { state, setState } = useStore();
  const [college, setCollege] = useState<CollegeId>(() => resolveCollege(params.get('college')));
  const [departmentId, setDepartmentId] = useState(() => resolveDepartment(resolveCollege(params.get('college')), params.get('department')));
  const [mode, setMode] = useState<'swipe' | 'grid'>('swipe');
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState(() => topics.find((item) => item === params.get('topic')) || '');
  const [detail, setDetail] = useState<Professor | null>(null);
  const [status, setStatus] = useState('');
  const department = departments.find((item) => item.id === departmentId)!;
  const collegeDepartments = departmentsFor(college);
  const filtered = ranked(state.profile.interests).filter(
    (professor) =>
      professor.departmentId === departmentId &&
      (!topic || professor.topics.includes(topic)) &&
      [professor.name, professor.role, professor.summary, ...professor.topics].join(' ').toLowerCase().includes(query.toLowerCase()),
  );
  const deck = filtered.filter((professor) => !state.decisions.some((decision) => decision.professorId === professor.id));
  const current = deck[0];
  const reviewed = filtered.length - deck.length;
  const heading = !department.ready
    ? 'Faculty for this department are on the way.'
    : mode === 'swipe'
      ? deck.length === 1
        ? '1 professor left in this stack.'
        : `${deck.length} professors left in this stack.`
      : filtered.length === 1
        ? '1 professor in this department.'
        : `${filtered.length} professors in this department.`;

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(''), 2800);
    return () => window.clearTimeout(timer);
  }, [status]);

  function syncUrl(nextCollege: CollegeId, nextDepartment: string) {
    const next = new URLSearchParams(params.toString());
    next.set('college', nextCollege);
    next.set('department', nextDepartment);
    next.delete('topic');
    router.replace(`/discover?${next.toString()}`, { scroll: false });
  }

  function decide(id: string, action: 'saved' | 'passed') {
    setState((currentState) => ({
      ...currentState,
      decisions: [...currentState.decisions.filter((decision) => decision.professorId !== id), { professorId: id, action }],
    }));
    void persistDecision({ professorId: id, action });
    setStatus(action === 'saved' ? 'Saved to your labs.' : 'Passed. Keep exploring.');
  }

  function undo() {
    const last = state.decisions.at(-1);
    setState((currentState) => ({ ...currentState, decisions: currentState.decisions.slice(0, -1) }));
    if (last) void persistDecisionRemoval(last.professorId);
    setStatus('Last decision undone.');
  }

  function chooseCollege(next: CollegeId) {
    const nextDepartment = resolveDepartment(next, null);
    setCollege(next);
    setDepartmentId(nextDepartment);
    setQuery('');
    setTopic('');
    setStatus('');
    syncUrl(next, nextDepartment);
  }

  function chooseDepartment(next: string) {
    setDepartmentId(next);
    setQuery('');
    setTopic('');
    setStatus('');
    syncUrl(college, next);
  }

  function restorePassed() {
    const passedIds = new Set(filtered.filter((professor) => state.decisions.some((decision) => decision.professorId === professor.id && decision.action === 'passed')).map((professor) => professor.id));
    setState((currentState) => ({
      ...currentState,
      decisions: currentState.decisions.filter((decision) => !(decision.action === 'passed' && passedIds.has(decision.professorId))),
    }));
    passedIds.forEach((id) => {
      void persistDecisionRemoval(id);
    });
    setStatus('Passed labs are back in the stack.');
  }

  return (
    <main className="app-main discover-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            <span className="status-dot" />
            {college} · {department.short}
          </p>
          <h1>Discover</h1>
          <p>{heading}</p>
        </div>
        {department.ready ? (
          <div className="segmented" role="group" aria-label="Discovery view">
            <button type="button" aria-pressed={mode === 'swipe'} onClick={() => setMode('swipe')}>
              Swipe
            </button>
            <button type="button" aria-pressed={mode === 'grid'} onClick={() => setMode('grid')}>
              Browse
            </button>
          </div>
        ) : null}
      </div>

      <div className="college-tabs" role="tablist" aria-label="College">
        {colleges.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={college === item.id} onClick={() => chooseCollege(item.id)}>
            {item.short}
          </button>
        ))}
      </div>
      <div className="department-tabs-wrap">
        <div className="department-tabs" role="tablist" aria-label={`${college} departments`}>
          {collegeDepartments.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={departmentId === item.id}
              className={item.ready ? undefined : 'soon'}
              onClick={() => chooseDepartment(item.id)}
            >
              {item.short}
              {item.ready ? null : <small>Soon</small>}
            </button>
          ))}
        </div>
      </div>

      {department.ready && filtered.length > 0 ? (
        <div className="discover-progress">
          <div className="discover-progress-track" aria-hidden="true">
            <div className="discover-progress-bar" style={{ width: `${filtered.length ? (reviewed / filtered.length) * 100 : 0}%` }} />
          </div>
          <p>
            {reviewed} of {filtered.length} reviewed
          </p>
        </div>
      ) : null}

      {state.profile.interests.length === 0 ? (
        <Link className="discover-nudge" href="/profile">
          <span aria-hidden="true">✶</span>
          <span>
            Add a few interests on your profile so closer matches rise to the top.
          </span>
        </Link>
      ) : null}

      {department.ready ? (
        <>
          <div className="filters">
            <div className="search-field">
              <input
                aria-label="Search professors"
                placeholder="Search a topic, role, or professor…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query ? (
                <button type="button" className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">
                  ×
                </button>
              ) : null}
            </div>
          </div>
          <div className="topic-chips" role="group" aria-label="Filter by interest">
            <button type="button" aria-pressed={!topic} onClick={() => setTopic('')}>
              All interests
            </button>
            {topics.map((item) => (
              <button key={item} type="button" aria-pressed={topic === item} onClick={() => setTopic(topic === item ? '' : item)}>
                {item}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {!department.ready ? (
        <div className="empty-state coming-soon">
          <span aria-hidden="true">◈</span>
          <h2>Coming soon</h2>
          <p>{department.name} faculty will be added next. AEM is ready to browse now in CSE.</p>
          <button className="button" type="button" onClick={() => chooseCollege('CSE')}>
            Browse AEM faculty
          </button>
        </div>
      ) : mode === 'swipe' ? (
        <div className="discovery-layout">
          {current ? (
            <SwipeDeck
              current={current}
              upcoming={deck.slice(1, 3)}
              onDecide={decide}
              onDetails={() => setDetail(current)}
            />
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">{filtered.length ? '♡' : '◈'}</span>
              <h2>{filtered.length ? 'You have seen this stack.' : 'No labs match that search.'}</h2>
              <p>{filtered.length ? 'Bring back the ones you passed, or browse everything at once.' : 'Try another topic, or clear the search.'}</p>
              <div className="saved-actions">
                {filtered.length ? (
                  <button className="button" type="button" onClick={restorePassed}>
                    Show passed labs
                  </button>
                ) : (
                  <button className="button" type="button" onClick={() => { setQuery(''); setTopic(''); }}>
                    Clear filters
                  </button>
                )}
                {filtered.length ? (
                  <button className="text-link" type="button" onClick={() => setMode('grid')}>
                    Browse all
                  </button>
                ) : null}
                {state.decisions.some((decision) => decision.action === 'saved') ? (
                  <Link className="text-link" href="/saved">
                    Open saved labs
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="professor-grid">
          {filtered.map((professor) => {
            const saved = state.decisions.some((decision) => decision.professorId === professor.id && decision.action === 'saved');
            return (
              <Card key={professor.id} p={professor} onDetails={() => setDetail(professor)} compact>
                <button
                  className={`button full${saved ? ' outline' : ''}`}
                  type="button"
                  disabled={saved}
                  onClick={() => decide(professor.id, 'saved')}
                >
                  {saved ? 'Saved' : 'Save lab'}
                </button>
              </Card>
            );
          })}
          {filtered.length === 0 ? (
            <div className="empty-state">
              <span aria-hidden="true">◈</span>
              <h2>No labs found.</h2>
              <p>Try another search, or look through every interest.</p>
              <button className="button" type="button" onClick={() => { setQuery(''); setTopic(''); }}>
                Clear filters
              </button>
            </div>
          ) : null}
        </div>
      )}

      <div className="discover-footer">
        {status ? (
          <p className="discover-toast" role="status">
            {status}
            {state.decisions.length > 0 ? (
              <button type="button" className="text-link" onClick={undo}>
                Undo
              </button>
            ) : null}
          </p>
        ) : state.decisions.length > 0 && current ? (
          <button type="button" className="text-link undo-link" onClick={undo}>
            Undo last decision
          </button>
        ) : (
          <p className="feedback" role="status" />
        )}
      </div>
      {detail ? <Detail professor={detail} close={() => setDetail(null)} /> : null}
    </main>
  );
}
