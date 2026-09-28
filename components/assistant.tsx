'use client';

import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { fetchProgress, requestDraft, saveProgress, sendChat, submitQuiz, type OutreachProgress } from '@/lib/client-api';
import { isProfileComplete, missingProfileFields, professors, ranked, type EmailDraft } from '@/lib/data';
import { useStore } from './store';

function mailDraftHref(email: string, subject: string, body: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const emptyProgress = (professorId: string): OutreachProgress => ({
  professorId,
  readSummary: false,
  researched: false,
  quizScore: null,
  quizPassed: false,
  draft: null,
});

export function Assistant() {
  const params = useSearchParams();
  const { isSignedIn } = useAuth();
  const { state, setState } = useStore();
  const [id, setId] = useState(() => professors.find((professor) => professor.id === params.get('professor'))?.id || professors[0].id);
  const [input, setInput] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<OutreachProgress>(() => emptyProgress(id));
  const [answers, setAnswers] = useState<string[]>(['', '', '', '', '']);
  const [results, setResults] = useState<{ correct: boolean; feedback: string }[] | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const professor = professors.find((item) => item.id === id)!;
  const draft = state.drafts.find((item) => item.professorId === id) || (progress.draft ? { ...progress.draft, professorId: id } : null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [state.chat.length]);

  useEffect(() => {
    setAnswers(['', '', '', '', '']);
    setResults(null);
    setMessage('');
    if (!isSignedIn) {
      setProgress(emptyProgress(id));
      return;
    }
    let cancelled = false;
    void fetchProgress(id).then((next) => {
      if (cancelled || !next) return;
      setProgress(next);
      if (next.draft) {
        setState((current) => ({
          ...current,
          drafts: [...current.drafts.filter((item) => item.professorId !== id), { ...next.draft!, professorId: id }],
        }));
      }
    }).catch(() => {
      if (!cancelled) setMessage('Could not load your research progress.');
    });
    return () => { cancelled = true; };
  }, [id, isSignedIn, setState]);

  function updateDraft(patch: Partial<EmailDraft>) {
    setState((current) => {
      const existing = current.drafts.find((item) => item.professorId === id) || { professorId: id, subject: '', body: '' };
      return { ...current, drafts: [...current.drafts.filter((item) => item.professorId !== id), { ...existing, ...patch }] };
    });
    setMessage('Draft saved.');
  }

  async function send(text: string) {
    if (!text.trim() || busy) return;
    if (/email|draft|introduction|hello/i.test(text)) {
      setState((current) => ({
        ...current,
        chat: [...current.chat, { role: 'user', text }, {
          role: 'assistant',
          text: !progress.quizPassed
            ? `Introductions stay locked until you read the summary, review Dr. ${professor.name}’s profile, and score 5/5 on the quiz. That keeps outreach genuine.`
            : !isProfileComplete(state.profile)
              ? `You passed the quiz. Finish your profile with your name, interests, and background before a draft can be written.`
              : `You already earned the draft for Dr. ${professor.name}. Use the panel to generate or edit it.`,
        }],
      }));
      setInput('');
      return;
    }
    if (!isSignedIn) {
      setState((current) => ({
        ...current,
        chat: [...current.chat, { role: 'user', text }, { role: 'assistant', text: 'Sign in to ask about this lab.' }],
      }));
      setInput('');
      return;
    }
    const nextChat = [...state.chat, { role: 'user' as const, text }];
    setState((current) => ({ ...current, chat: nextChat }));
    setInput('');
    setBusy(true);
    try {
      const reply = await sendChat(id, nextChat);
      setState((current) => ({ ...current, chat: [...current.chat, { role: 'assistant', text: reply.text }] }));
    } catch (error) {
      setState((current) => ({
        ...current,
        chat: [...current.chat, { role: 'assistant', text: error instanceof Error ? error.message : 'LabMatch could not answer just now.' }],
      }));
    } finally {
      setBusy(false);
    }
  }

  async function mark(patch: { readSummary?: boolean; researched?: boolean }) {
    if (!isSignedIn) {
      setMessage('Sign in to start the introduction path.');
      return;
    }
    setBusy(true);
    try {
      setProgress(await saveProgress(id, patch));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save that step.');
    } finally {
      setBusy(false);
    }
  }

  async function grade() {
    if (!isSignedIn) {
      setMessage('Sign in to take the quiz.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const graded = await submitQuiz(id, answers);
      setResults(graded.results);
      setProgress((current) => ({ ...current, quizScore: graded.score, quizPassed: graded.passed }));
      setMessage(graded.passed
        ? (isProfileComplete(state.profile)
          ? '5/5 — you can draft a genuine introduction now.'
          : '5/5 — finish your profile next so the draft can use your name, interests, and background.')
        : `${graded.score}/5. Review the summary and try again.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not grade the quiz.');
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    if (!progress.quizPassed) {
      setMessage('Score 5/5 on the quiz before a draft is created.');
      return;
    }
    if (!isProfileComplete(state.profile)) {
      const missing = missingProfileFields(state.profile).join(', ');
      setMessage(`Complete your profile before a draft is created. Still needed: ${missing}.`);
      return;
    }
    setBusy(true);
    try {
      const created = await requestDraft(id, state.profile);
      updateDraft(created.draft);
      setProgress((current) => ({ ...current, draft: created.draft }));
      setMessage('Draft ready. Edit it before you copy it.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not draft the email.');
    } finally {
      setBusy(false);
    }
  }

  const step = progress.quizPassed ? 4 : progress.researched ? 3 : progress.readSummary ? 2 : 1;

  return (
    <main className="app-main">
      <div className="page-heading">
        <div>
          <h1>Companion</h1>
          <p>Ask about a lab. Drafts unlock after a 5/5 research quiz and a complete profile.</p>
        </div>
        <span className="demo-pill">{isSignedIn ? 'LabMatch generated' : 'Sign in required'}</span>
      </div>
      <div className="assistant-layout">
        <section className="chat-panel">
          <div className="panel-title">
            <span>Chat</span>
            <button className="text-link" disabled={!state.chat.length} onClick={() => setState((current) => ({ ...current, chat: [] }))}>Clear chat</button>
          </div>
          <div className="chat-messages" aria-live="polite">
            {!state.chat.length && (
              <div className="chat-welcome">
                <h2>Ask a question</h2>
                <p>LabMatch can explain Dr. {professor.name}’s work. It will not write an email until you pass the quiz and complete your profile.</p>
              </div>
            )}
            {state.chat.map((item, index) => (
              <div key={index} className={'chat-message ' + item.role}>
                <small>{item.role === 'user' ? 'YOU' : 'LABMATCH'}</small>
                <p>{item.text}</p>
              </div>
            ))}
            <div ref={end} />
          </div>
          <div className="suggestions">
            {['What does this lab study?', 'Explain this professor’s methods', 'Draft an introduction'].map((prompt) => (
              <button key={prompt} onClick={() => send(prompt)} disabled={busy}>{prompt} ↗</button>
            ))}
          </div>
          <form className="chat-input" onSubmit={(event) => { event.preventDefault(); void send(input); }}>
            <input aria-label="Message companion" placeholder="What are you curious about?" value={input} onChange={(event) => setInput(event.target.value)} />
            <button className="button small" disabled={!input.trim() || busy} aria-label="Send chat message">↑</button>
          </form>
        </section>
        <section className="draft-panel">
          <h2>Introduction path</h2>
          <label>
            Choose a professor
            <select value={id} onChange={(event) => setId(event.target.value)}>
              {professors.map((item) => <option value={item.id} key={item.id}>Dr. {item.name}</option>)}
            </select>
          </label>
          <ol className="research-steps">
            <li className={step >= 1 ? 'current' : ''} data-done={progress.readSummary}>Read the summary</li>
            <li className={step >= 2 ? 'current' : ''} data-done={progress.researched}>Review the profile</li>
            <li className={step >= 3 ? 'current' : ''} data-done={progress.quizPassed}>Score 5/5</li>
            <li className={step >= 4 ? 'current' : ''} data-done={Boolean(draft)}>Draft the email</li>
          </ol>
          {!isSignedIn ? (
            <p className="draft-placeholder">Sign in to save this path and unlock a draft.</p>
          ) : !progress.readSummary ? (
            <div className="research-block">
              <h3>1. Read the research summary</h3>
              <p>{professor.summary}</p>
              {professor.topics.length > 0 && <div className="tags">{professor.topics.map((topic) => <span key={topic}>{topic}</span>)}</div>}
              <button className="button full" disabled={busy} onClick={() => void mark({ readSummary: true })}>I have read this summary</button>
            </div>
          ) : !progress.researched ? (
            <div className="research-block">
              <h3>2. Do a little research</h3>
              <p>Open Dr. {professor.name}’s AEM profile, look at their current work, and come back ready for five questions.</p>
              <a className="button outline full" href={professor.url} target="_blank" rel="noreferrer">Open AEM profile ↗</a>
              <button className="button full" disabled={busy} onClick={() => void mark({ researched: true })}>I reviewed their profile</button>
            </div>
          ) : !progress.quizPassed ? (
            <form className="research-block" onSubmit={(event) => { event.preventDefault(); void grade(); }}>
              <h3>3. Research quiz</h3>
              <p>Choose one option per question. You need 5/5 to draft.</p>
              {professor.quiz.map((item, index) => (
                <fieldset key={item.question} className="quiz-question">
                  <legend>{index + 1}. {item.question}</legend>
                  {item.choices.map((choice) => (
                    <label key={choice} className="quiz-choice">
                      <input
                        type="radio"
                        name={`quiz-${index}`}
                        value={choice}
                        checked={answers[index] === choice}
                        onChange={() => setAnswers((current) => current.map((value, answerIndex) => answerIndex === index ? choice : value))}
                      />
                      <span>{choice}</span>
                    </label>
                  ))}
                  {results?.[index] && <small className={results[index].correct ? 'quiz-ok' : 'quiz-miss'}>{results[index].correct ? 'Correct. ' : 'Not yet. '}{results[index].feedback}</small>}
                </fieldset>
              ))}
              <button className="button full" disabled={busy || answers.some((answer) => !answer.trim())}>Submit quiz</button>
            </form>
          ) : (
            <div className="research-block">
              <h3>4. Email draft</h3>
              {!isProfileComplete(state.profile) && (
                <p>Finish your <Link href="/profile">profile</Link> with your name, interests, and background so the draft can sound like you. Still needed: {missingProfileFields(state.profile).join(', ')}.</p>
              )}
              <button className="button outline full" disabled={busy || !isProfileComplete(state.profile)} onClick={() => void generate()}>{draft ? 'Regenerate draft' : '✧ Generate a draft'}</button>
              {draft ? (
                <>
                  <label>Subject<input value={draft.subject} onChange={(event) => updateDraft({ subject: event.target.value })} /></label>
                  <label>Email body<textarea ref={bodyRef} className="email-body" value={draft.body} onChange={(event) => updateDraft({ body: event.target.value })} /></label>
                  <div className="saved-actions">
                    <button className="button small" onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(draft.subject + '\n\n' + draft.body);
                        setMessage('Subject and email copied.');
                      } catch {
                        bodyRef.current?.focus();
                        bodyRef.current?.select();
                        setMessage('Clipboard unavailable. Email body selected; copy it manually, then copy the subject.');
                      }
                    }}>Copy draft ↗</button>
                    <button className="text-link" onClick={() => setMessage('Draft saved on this device.')}>Save draft</button>
                  </div>
                </>
              ) : (
                <p className="draft-placeholder">Generate a draft from your profile and this lab’s work.</p>
              )}
            </div>
          )}
          <p role="status" className="feedback">{message}</p>
          {draft && professor.email ? (
            <a
              className="button full"
              href={mailDraftHref(professor.email, draft.subject, draft.body)}
              onClick={() => setMessage(`Opened your email app with a draft to Dr. ${professor.name}. Review it before you send.`)}
            >
              Open in email app
            </a>
          ) : (
            <button className="button disabled full" disabled>
              {draft ? 'No email address for this professor' : 'Open in email app'}
            </button>
          )}
          <p className="small-copy">LabMatch does not send email. {draft && professor.email ? `This opens a draft to ${professor.email} in your mail app so you can review it first.` : 'Generate a draft to open it in your mail app.'} {isProfileComplete(state.profile) ? 'Your profile is used to personalize drafts.' : <>Complete your <Link href="/profile">profile</Link> so a draft can use your name, interests, and background.</>} LabMatch can also point you toward other labs: {ranked(state.profile.interests).slice(0, 2).map((item) => item.name).join(', ') || 'add interests first'}.</p>
        </section>
      </div>
    </main>
  );
}
