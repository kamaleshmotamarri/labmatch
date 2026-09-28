import Link from 'next/link';
import { BrandLockup } from '@/components/brand';
import { LandingNav } from '@/components/landing-nav';
import { departments, professors, topics } from '@/lib/data';

const featured = professors[0];
const behind = professors.slice(1, 3);
const faces = professors.slice(2, 5);
const teaser = (featured.summary.split(/(?<=[.!?])\s/)[0] ?? featured.summary).trim();
const readyDepartments = departments.filter((department) => department.ready);
const lineup = professors.slice(0, 4);
const firstSentence = (summary: string) => (summary.split(/(?<=[.!?])\s/)[0] ?? summary).trim();

const stats = [
  { value: String(professors.length), label: 'AEM faculty in the deck' },
  { value: String(topics.length), label: 'research topics to filter by' },
  { value: String(departments.length), label: 'departments mapped across CSE and CBS' },
  { value: '0', label: 'emails sent on your behalf' },
];

const faqs = [
  {
    question: 'Does labmatch email professors for me?',
    answer: 'No. Drafting is practice only. Nothing leaves the app, so you can rewrite an intro as many times as you want before sending it yourself from your own inbox.',
  },
  {
    question: 'Where does the faculty information come from?',
    answer: 'Every profile is built from the public University of Minnesota directory and department pages. Research summaries are condensed for skimming, and each card links out to the original page.',
  },
  {
    question: 'Which departments are available?',
    answer: `Aerospace Engineering and Mechanics is fully loaded. The other ${departments.length - readyDepartments.length} departments are mapped and marked "Soon" while their faculty are added.`,
  },
  {
    question: 'Do I need research experience first?',
    answer: 'No. Most students who reach out have coursework and curiosity and nothing else. The profile step asks for exactly that, then uses it to rank labs and shape your draft.',
  },
];

export default function Home() {
  return (
    <div className="landing">
      <LandingNav />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span className="status-dot" /> UNIVERSITY OF MINNESOTA</div>
            <h1>
              Find your people.
              <br />
              Discover your
              <br />
              <em>research.</em>
              <span className="drawn-star" aria-hidden="true">✶</span>
            </h1>
            <p>Browse labs, save a few, and practice a first email.</p>
            <div className="hero-actions">
              <Link className="button" href="/discover">Find a lab <span>↗</span></Link>
              <a className="text-link" href="#how-it-works">How it works</a>
            </div>
            <div className="hero-note">
              <div className="mini-avatars" aria-hidden="true">
                {faces.map((professor) => (
                  <span key={professor.id}>
                    <img src={professor.photo} alt="" />
                  </span>
                ))}
              </div>
              <p><strong>{professors.length} AEM faculty</strong> from the public directory, ready to browse.</p>
            </div>
          </div>
          <div className="hero-visual">
            <p className="orbit-label">IN THE DECK <span aria-hidden="true">✶</span></p>
            <div className="back-card back-one" aria-hidden="true">
              {behind[1] ? <img src={behind[1].photo} alt="" /> : null}
            </div>
            <div className="back-card back-two" aria-hidden="true">
              {behind[0] ? <img src={behind[0].photo} alt="" /> : null}
            </div>
            <div className="preview-card">
              <div className="preview-art">
                <span className="research-label"><span className="status-dot" /> FACULTY</span>
                <img src={featured.photo} alt="" className="professor-photo" />
                <span className="art-caption">{featured.topics.slice(0, 2).join('  ·  ')}</span>
              </div>
              <div className="preview-content">
                <div className="card-meta">{featured.department}</div>
                <h2>Dr. {featured.name}</h2>
                <p className="lab-name">{featured.role}</p>
                <p className="preview-blurb">{teaser}</p>
                <div className="tags">{featured.topics.slice(0, 2).map((topic) => <span key={topic}>{topic}</span>)}</div>
              </div>
            </div>
            <aside className="floating-note">
              <span aria-hidden="true">✶</span>
              <strong>Save the ones</strong><br />
              that feel like you.
            </aside>
            <div className="preview-controls">
              <Link href="/discover" aria-label="Pass a professor" className="round-button">×</Link>
              <Link href="/discover" aria-label="View professor details" className="round-button info">i</Link>
              <Link href="/discover" aria-label="Save a professor" className="round-button heart">♡</Link>
            </div>
            <p className="demo-caption">Pass, open, or save. Nothing is sent from here.</p>
          </div>
        </section>
        <section className="discipline-strip" id="explore">
          <Link href="/discover?college=CSE&department=aem"><span>CSE · AEM</span></Link>
          <Link href="/discover?college=CSE"><span>CSE departments</span></Link>
          <Link href="/discover?college=CBS"><span>CBS departments</span></Link>
        </section>
        <section className="stat-band" aria-label="What is inside labmatch">
          {stats.map((stat) => (
            <div key={stat.label}>
              <strong>{stat.value}</strong>
              <p>{stat.label}</p>
            </div>
          ))}
        </section>
        <section className="how-section" id="how-it-works">
          <div className="section-heading"><h2>How it works</h2></div>
          <div className="steps">
            <article><span className="step-number">01</span><h3>Add interests</h3><p>A few topics are enough to start.</p></article>
            <article><span className="step-number">02</span><h3>Save labs</h3><p>Swipe through AEM faculty.</p></article>
            <article><span className="step-number">03</span><h3>Draft a hello</h3><p>Practice an email. Nothing is sent.</p></article>
          </div>
        </section>
        <section className="topic-section" id="interests">
          <div className="section-heading">
            <h2>Start from what<br />interests you.</h2>
            <p>Every topic is pulled from the research summaries themselves.</p>
          </div>
          <div className="topic-links">
            {topics.map((topic) => (
              <Link key={topic} href={`/discover?college=CSE&department=aem&topic=${encodeURIComponent(topic)}`}>
                {topic} <span aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="faculty-section" id="faculty">
          <div className="section-heading">
            <h2>A few faces<br />from the deck.</h2>
            <p>{professors.length} in total, all from the public directory.</p>
          </div>
          <div className="faculty-lineup">
            {lineup.map((professor) => (
              <article key={professor.id}>
                <div className={`faculty-photo ${professor.color}`}>
                  <img src={professor.photo} alt="" />
                </div>
                <h3>Dr. {professor.name}</h3>
                <p className="faculty-role">{professor.role}</p>
                <p className="faculty-blurb">{firstSentence(professor.summary)}</p>
                <div className="tags">{professor.topics.slice(0, 2).map((topic) => <span key={topic}>{topic}</span>)}</div>
              </article>
            ))}
          </div>
          <Link className="text-link" href="/discover">Browse every lab <span aria-hidden="true">↗</span></Link>
        </section>
        <section className="faq-section" id="faq">
          <div className="section-heading"><h2>Questions</h2></div>
          <div className="faq-list">
            {faqs.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}<span aria-hidden="true">+</span></summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="closing">
          <span className="closing-star" aria-hidden="true">✶</span>
          <div className="eyebrow"><span className="status-dot" /> READY WHEN YOU ARE</div>
          <h2>Find a lab this<br />semester.</h2>
          <p>Save a few labs tonight, and write the email when it feels less scary.</p>
          <Link className="button gold-button" href="/discover">Start browsing <span>↗</span></Link>
        </section>
      </main>
      <footer>
        <BrandLockup />
        <p>Independent student demo. Not affiliated with the University of Minnesota. AEM faculty from the public directory. No emails sent.</p>
      </footer>
    </div>
  );
}
