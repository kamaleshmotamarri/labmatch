'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';
import { persistDecision, useStore } from './store';
import type { Professor } from '@/lib/data';

export function teaser(summary: string) {
  return (summary.split(/(?<=[.!?])\s/)[0] ?? summary).trim();
}

export function Card({
  p,
  onDetails,
  children,
  compact = false,
  priority = false,
}: {
  p: Professor;
  onDetails: () => void;
  children?: ReactNode;
  compact?: boolean;
  priority?: boolean;
}) {
  const { state } = useStore();
  const shared = p.topics.filter((topic) => state.profile.interests.includes(topic));
  const saved = state.decisions.some((decision) => decision.professorId === p.id && decision.action === 'saved');
  const visibleTopics = compact ? p.topics.slice(0, 2) : p.topics;

  return (
    <article className={`professor-card${compact ? ' compact' : ''}${saved ? ' is-saved' : ''}`}>
      <div className={`professor-art ${p.color}`}>
        <span className="research-label">
          <span className="status-dot" />
          {p.category.toUpperCase()}
        </span>
        {saved ? <span className="saved-pill">Saved</span> : null}
        <Image
          src={p.photo}
          alt={`Portrait of Dr. ${p.name}`}
          fill
          sizes={compact ? '(max-width: 800px) 100vw, 33vw' : '(max-width: 600px) 90vw, 440px'}
          className="professor-photo"
          priority={priority}
        />
      </div>
      <div className="professor-body">
        <div className="card-meta">{p.department}</div>
        <button className="name-button" type="button" onClick={onDetails}>
          Dr. {p.name}
        </button>
        <p className="lab-name">{p.role}</p>
        <p className="card-summary">{compact ? teaser(p.summary) : p.summary}</p>
        {visibleTopics.length > 0 ? (
          <div className="tags">
            {visibleTopics.map((topic) => (
              <span key={topic}>{topic}</span>
            ))}
          </div>
        ) : null}
        {shared.length > 0 ? <div className="match-reason">Matches {shared.join(' and ')}</div> : null}
        {compact ? (
          <button className="text-link card-more" type="button" onClick={onDetails}>
            Read more
          </button>
        ) : null}
        {children}
      </div>
    </article>
  );
}

export function Detail({ professor: p, close }: { professor: Professor; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { state, setState } = useStore();
  const saved = state.decisions.some((decision) => decision.professorId === p.id && decision.action === 'saved');

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  function save() {
    setState((current) => ({
      ...current,
      decisions: [...current.decisions.filter((decision) => decision.professorId !== p.id), { professorId: p.id, action: 'saved' }],
    }));
    void persistDecision({ professorId: p.id, action: 'saved' });
  }

  return (
    <dialog
      ref={dialog}
      onCancel={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="detail-dialog"
      aria-labelledby="detail-title"
    >
      <button className="dialog-close" type="button" onClick={close} aria-label="Close details">
        ×
      </button>
      <div className={`detail-photo ${p.color}`}>
        <Image src={p.photo} alt={`Portrait of Dr. ${p.name}`} fill sizes="540px" className="professor-photo" />
      </div>
      <div className="eyebrow">
        {p.department.toUpperCase()} · {p.category.toUpperCase()}
      </div>
      <h2 id="detail-title">Dr. {p.name}</h2>
      <p className="lab-name">{p.role}</p>
      <p>{p.summary}</p>
      {p.topics.length > 0 ? (
        <div className="tags">
          {p.topics.map((topic) => (
            <span key={topic}>{topic}</span>
          ))}
        </div>
      ) : null}
      {p.email ? <p className="muted">{p.email}</p> : null}
      <div className="saved-actions">
        <Link href={`/assistant?professor=${p.id}`} className="button">
          Draft an introduction <span>↗</span>
        </Link>
        {saved ? (
          <Link className="text-link" href="/saved">
            View saved labs
          </Link>
        ) : (
          <button className="text-link" type="button" onClick={save}>
            Save this lab
          </button>
        )}
        <a className="text-link" href={p.url} target="_blank" rel="noreferrer">
          AEM profile ↗
        </a>
      </div>
    </dialog>
  );
}
