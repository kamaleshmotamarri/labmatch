'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BrandLockup } from './brand';
import { persistDecision, persistDecisionRemoval, useStore } from './store';
import { colleges, departments, departmentsFor, professors, ranked, topics, emptyProfile, isProfileComplete, missingProfileFields, type CollegeId, type Professor } from '@/lib/data';
const links = [['/discover','◈','Discover'],['/saved','♡','Saved labs'],['/assistant','✧','Companion'],['/profile','◎','My profile']];
export function Workspace({ children, auth }: { children: React.ReactNode; auth: React.ReactNode }) { const path = usePathname(); const {state,ready,storageError}=useStore(); return <div className="workspace"><header className="app-bar"><BrandLockup /><div className="app-bar-end"><span className="muted app-bar-school">University of Minnesota</span>{auth}</div></header><aside className="sidebar"><nav aria-label="App navigation">{links.map(([href,icon,label])=><Link key={href} href={href} className={path===href?'active':''}><span>{icon}</span>{label}{href==='/saved' && <small>{state.decisions.filter(d=>d.action==='saved').length}</small>}</Link>)}</nav><div className="sidebar-bottom"><span className="demo-pill">UMN CSE · AEM sample</span></div></aside><div className="workspace-content">{storageError&&<p role="status" className="notice">Browser storage is unavailable. Your changes will last for this session.</p>}{ready?children:<p className="loading">Getting your research desk ready…</p>}</div></div>; }
function Detail({ professor: p, close }: { professor: Professor; close:()=>void }) { const dialog=useRef<HTMLDialogElement>(null); useEffect(()=>{dialog.current?.showModal();},[]); return <dialog ref={dialog} onCancel={close} onClick={e=>{if(e.target===e.currentTarget)close();}} className="detail-dialog" aria-labelledby="detail-title"><button className="dialog-close" onClick={close} aria-label="Close details">×</button><div className="eyebrow">{p.department.toUpperCase()} · {p.category.toUpperCase()}</div><h2 id="detail-title">Dr. {p.name}</h2><p className="lab-name">{p.role}</p><p>{p.summary}</p>{p.topics.length>0&&<div className="tags">{p.topics.map(t=><span key={t}>{t}</span>)}</div>}{p.email&&<p className="muted">{p.email}</p>}<div className="saved-actions"><Link href={'/assistant?professor='+p.id} className="button">Draft an introduction ↗</Link><a className="text-link" href={p.url} target="_blank" rel="noreferrer">AEM profile ↗</a></div></dialog>; }
function Card({p,onDetails,children}: {p:Professor;onDetails:()=>void;children?:React.ReactNode}) {const {state}=useStore(); const shared=p.topics.filter(t=>state.profile.interests.includes(t));return <article className="professor-card"><div className={'professor-art '+p.color}><span className="research-label">{p.category.toUpperCase()}</span><img src={p.photo} alt={'Portrait of Dr. '+p.name} className="professor-photo"/></div><div className="professor-body"><div className="card-meta">{p.department}</div><button className="name-button" onClick={onDetails}>Dr. {p.name}</button><p className="lab-name">{p.role}</p><p>{p.summary}</p><div className="tags">{p.topics.map(t=><span key={t}>{t}</span>)}</div>{shared.length>0&&<div className="match-reason">Matches {shared.join(' and ')}</div>}{children}</div></article>;}
function resolveCollege(value: string | null): CollegeId {
  return value?.toUpperCase() === 'CBS' ? 'CBS' : 'CSE';
}
function resolveDepartment(college: CollegeId, value: string | null) {
  const available = departmentsFor(college);
  return available.find((department) => department.id === value?.toLowerCase())?.id || available.find((department) => department.ready)?.id || available[0].id;
}
export function Discover() {
  const params = useSearchParams();
  const {state,setState}=useStore();
  const [college,setCollege]=useState<CollegeId>(() => resolveCollege(params.get('college')));
  const [departmentId,setDepartmentId]=useState(() => resolveDepartment(resolveCollege(params.get('college')), params.get('department')));
  const [mode,setMode]=useState('swipe');
  const [query,setQuery]=useState('');
  const [topic,setTopic]=useState('');
  const [detail,setDetail]=useState<Professor|null>(null);
  const [status,setStatus]=useState('');
  const start=useRef<number|null>(null);
  const department = departments.find((item) => item.id === departmentId)!;
  const collegeDepartments = departmentsFor(college);
  const filtered=ranked(state.profile.interests).filter(p=>p.departmentId===departmentId&&(!topic||p.topics.includes(topic))&&[p.name,p.role,p.summary,...p.topics].join(' ').toLowerCase().includes(query.toLowerCase()));
  const deck=filtered.filter(p=>!state.decisions.some(d=>d.professorId===p.id));
  const current=deck[0];
  function decide(id:string,action:'saved'|'passed') { setState(s=>({...s,decisions:[...s.decisions.filter(d=>d.professorId!==id),{professorId:id,action}]}));void persistDecision({professorId:id,action});setStatus(action==='saved'?'Added to your saved labs.':'Passed. Keep exploring!'); }
  function undo(){const last=state.decisions.at(-1);setState(s=>({...s,decisions:s.decisions.slice(0,-1)}));if(last)void persistDecisionRemoval(last.professorId);setStatus('Last decision undone.');}
  function chooseCollege(next: CollegeId) {
    setCollege(next);
    setDepartmentId(resolveDepartment(next, null));
    setQuery('');
    setTopic('');
    setStatus('');
  }
  const showUndo = state.decisions.length !== 0;
  const heading = !department.ready ? 'Coming soon.' : mode==='swipe' ? (deck.length === 1 ? '1 professor to review.' : `${deck.length} professors to review.`) : (filtered.length === 1 ? '1 professor.' : `${filtered.length} professors.`);
  return (
  <main className="app-main">
   <div className="college-tabs" role="tablist" aria-label="College">
    {colleges.map((item) => <button key={item.id} role="tab" aria-selected={college===item.id} onClick={()=>chooseCollege(item.id)}>{item.short}</button>)}
   </div>
   <div className="department-tabs" role="tablist" aria-label={`${college} departments`}>
    {collegeDepartments.map((item) => <button key={item.id} role="tab" aria-selected={departmentId===item.id} className={item.ready?'':'soon'} onClick={()=>{setDepartmentId(item.id);setQuery('');setTopic('');setStatus('');}}>{item.short}</button>)}
   </div>
   <div className="page-heading">
    <div><h1>Discover</h1><p>{department.name}. {heading}</p></div>
    {department.ready && <div className="segmented">
     <button aria-pressed={mode==='swipe'} onClick={()=>setMode('swipe')}>Swipe</button>
     <button aria-pressed={mode==='grid'} onClick={()=>setMode('grid')}>Browse</button>
    </div>}
   </div>
   {!department.ready ? (
    <div className="empty-state coming-soon">
     <h2>Coming soon</h2>
     <p>{department.name} faculty will be added next. AEM is available now in CSE.</p>
     <button className="button" onClick={()=>chooseCollege('CSE')}>Browse AEM faculty</button>
    </div>
   ) : (
    <>
     <div className="filters">
      <input aria-label="Search professors" placeholder="Search a topic, role, or professor…" value={query} onChange={e=>setQuery(e.target.value)}/>
      <select aria-label="Filter topic" value={topic} onChange={e=>setTopic(e.target.value)}><option value="">All interests</option>{topics.map(t=><option key={t}>{t}</option>)}</select>
     </div>
     {mode==='swipe' ? (
      <div className="discovery-layout">
       <div className="swipe-area" tabIndex={0} aria-label="Professor deck. Use left arrow to pass or right arrow to save." onKeyDown={e=>{if(e.target!==e.currentTarget||detail)return;if(current&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();decide(current.id,e.key==='ArrowRight'?'saved':'passed');}}} onPointerDown={e=>{start.current=e.clientX;}} onPointerCancel={()=>{start.current=null;}} onPointerUp={e=>{if(start.current!==null&&current&&Math.abs(e.clientX-start.current)>85)decide(current.id,e.clientX>start.current?'saved':'passed');start.current=null;}}>
        {current ? (
         <div key={current.id}>
          <div className="card-enter"><Card p={current} onDetails={()=>setDetail(current)}/></div>
          <div className="swipe-actions">
           <button className="round-button" onClick={()=>decide(current.id,'passed')} aria-label="Pass professor">×</button>
           <button className="round-button info" onClick={()=>setDetail(current)} aria-label="View professor details">i</button>
           <button className="round-button heart" onClick={()=>decide(current.id,'saved')} aria-label="Save professor">♡</button>
          </div>
          {showUndo ? <button className="text-link undo-link" onClick={undo}>Undo</button> : null}
         </div>
        ) : (
         <div className="empty-state">
          <h2>{filtered.length ? 'You have seen this stack.' : 'No labs found.'}</h2>
          <p>{filtered.length ? 'Bring back the ones you passed.' : 'Try another search.'}</p>
          <button className="button" onClick={()=>{if(filtered.length)setState(s=>({...s,decisions:s.decisions.filter(d=>d.action!=='passed')}));else{setQuery('');setTopic('');}}}>{filtered.length?'Show passed labs':'Clear filters'}</button>
         </div>
        )}
       </div>
      </div>
     ) : (
      <div className="professor-grid">
       {filtered.map(p=><Card key={p.id} p={p} onDetails={()=>setDetail(p)}><button className="button outline full" disabled={state.decisions.some(d=>d.professorId===p.id&&d.action==='saved')} onClick={()=>decide(p.id,'saved')}>{state.decisions.some(d=>d.professorId===p.id&&d.action==='saved')?'Saved':'Save lab'}</button></Card>)}
       {!filtered.length && <p>No results. Try another search.</p>}
      </div>
     )}
    </>
   )}
   <p role="status" className="feedback">{status}</p>
   {detail && <Detail professor={detail} close={()=>setDetail(null)}/>}
  </main>
 );
}
export function Saved() {const {state,setState}=useStore();const [detail,setDetail]=useState<Professor|null>(null);const saved=professors.filter(p=>state.decisions.some(d=>d.professorId===p.id&&d.action==='saved')); return <main className="app-main"><div className="page-heading"><div><h1>Saved</h1><p>{saved.length === 1 ? '1 saved lab.' : `${saved.length} saved labs.`}</p></div></div>{saved.length?<div className="professor-grid">{saved.map(p=><Card key={p.id} p={p} onDetails={()=>setDetail(p)}><div className="saved-actions"><Link className="button small" href={'/assistant?professor='+p.id}>Draft a hello ↗</Link><button className="text-link" onClick={()=>{setState(s=>({...s,decisions:s.decisions.filter(d=>d.professorId!==p.id)}));void persistDecisionRemoval(p.id);}}>Remove</button></div></Card>)}</div>:<div className="empty-state"><h2>Nothing saved yet.</h2><p>Labs you save in Discover show up here.</p><Link className="button" href="/discover">Discover labs</Link></div>}{detail&&<Detail professor={detail} close={()=>setDetail(null)}/>}</main>;}
export function Profile(){const {state,setState}=useStore();const [message,setMessage]=useState('');const [custom,setCustom]=useState(''); const [confirm,setConfirm]=useState(false); const p=state.profile;function field(key:string,value:string){setState(s=>({...s,profile:{...s.profile,[key]:value}}));setMessage('Changes saved on this device.');} function toggle(t:string){setState(s=>({...s,profile:{...s.profile,interests:s.profile.interests.includes(t)?s.profile.interests.filter(x=>x!==t):[...s.profile.interests,t]}}));}
 return <main className="app-main profile-main"><div className="page-heading"><div><h1>Profile</h1><p>Saved on this device. Fill in every field so LabMatch can write a personalized introduction.</p></div></div><form className="profile-panel" onSubmit={e=>{e.preventDefault();setMessage('Profile saved.');}}><h2>About you</h2><div className="form-grid"><label>Your name<input value={p.name} onChange={e=>field('name',e.target.value)} placeholder="What should we call you?"/></label><label>Major or field of study<input value={p.major} onChange={e=>field('major',e.target.value)} placeholder="e.g. Computer science, or still exploring"/></label><label>Year in college<select value={p.year} onChange={e=>field('year',e.target.value)}><option value="">Choose your year</option>{['First year','Second year','Third year','Fourth year','Fifth year or beyond','Graduate student'].map(y=><option key={y}>{y}</option>)}</select></label></div><hr/><h2>Interests</h2><div className="interest-options">{[...new Set([...topics,...p.interests])].map(t=><button type="button" key={t} aria-pressed={p.interests.includes(t)} onClick={()=>toggle(t)}>{p.interests.includes(t)?'✓ ':'+ '}{t}</button>)}</div><div className="custom-interest"><input aria-label="Custom research interest" placeholder="Add another interest" value={custom} onChange={e=>setCustom(e.target.value)}/><button type="button" className="button outline" disabled={!custom.trim()} onClick={()=>{if(!p.interests.includes(custom.trim()))toggle(custom.trim());setCustom('');}}>Add</button></div><hr/><h2>Background</h2><label>Previous coursework<textarea value={p.coursework} onChange={e=>field('coursework',e.target.value)} placeholder="e.g. Intro to Psychology, Statistics, Biology…"/></label><label>Skills and experience<textarea value={p.skills} onChange={e=>field('skills',e.target.value)} placeholder="e.g. Python, writing, interviewing, working in a team…"/></label><label>What would you love to explore?<textarea value={p.goals} onChange={e=>field('goals',e.target.value)} placeholder="There are no wrong questions."/></label><div className="saved-actions"><button className="button" type="submit">Save profile ✓</button><Link href="/discover" className="text-link">Find your lab ↗</Link></div><p role="status" className="feedback">{message || (isProfileComplete(p) ? 'Profile complete. Drafts can use your name, interests, and background.' : `Still needed: ${missingProfileFields(p).join(', ')}.`)}</p></form><div className="reset-panel"><p>Reset profile, saved labs, chat, and drafts.</p>{confirm?<div className="saved-actions"><button className="button" onClick={()=>{setState(()=>({profile:emptyProfile,decisions:[],chat:[],drafts:[]}));void persistDecisionRemoval();setConfirm(false);setMessage('Demo reset.');}}>Confirm reset</button><button className="text-link" onClick={()=>setConfirm(false)}>Cancel</button></div>:<button className="text-link" onClick={()=>setConfirm(true)}>Reset demo</button>}</div></main>;
}
