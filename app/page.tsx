import Link from 'next/link';
import { AuthControls } from '@/components/auth-controls';
import { BrandLockup } from '@/components/brand';
import { professors } from '@/lib/data';

const featured = professors[0];
const behind = professors.slice(1, 3);
const faces = professors.slice(2, 5);
const teaser = (featured.summary.split(/(?<=[.!?])\s/)[0] ?? featured.summary).trim();

export default function Home() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <BrandLockup />
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <Link href="/discover">Discover</Link>
        </nav>
        <AuthControls signedInExtra={<Link className="button small" href="/discover">Open app <span>↗</span></Link>} />
      </header>
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
        <section className="how-section" id="how-it-works">
          <div className="section-heading"><h2>How it works</h2></div>
          <div className="steps">
            <article><span className="step-number">01</span><h3>Add interests</h3><p>A few topics are enough to start.</p></article>
            <article><span className="step-number">02</span><h3>Save labs</h3><p>Swipe through AEM faculty.</p></article>
            <article><span className="step-number">03</span><h3>Draft a hello</h3><p>Practice an email. Nothing is sent.</p></article>
          </div>
        </section>
      </main>
      <footer>
        <BrandLockup />
        <p>Independent student demo. Not affiliated with the University of Minnesota. AEM faculty from the public directory. No emails sent.</p>
      </footer>
    </div>
  );
}
