'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuthControls } from './auth-controls';
import { BrandLockup } from './brand';

const links = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#faculty', label: 'Faculty' },
  { href: '#faq', label: 'FAQ' },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={open ? 'landing-nav is-open' : 'landing-nav'}>
      <BrandLockup />
      <nav id="landing-menu" aria-label="Main navigation">
        {links.map((link) => (
          <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
            {link.label}
          </a>
        ))}
        <Link href="/discover" onClick={() => setOpen(false)}>
          Discover
        </Link>
      </nav>
      <div className="landing-nav-actions">
        <AuthControls signedInExtra={<Link className="button small" href="/discover">Open app <span>↗</span></Link>} />
        <button
          type="button"
          className="nav-menu-button"
          aria-expanded={open}
          aria-controls="landing-menu"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="sr-only">{open ? 'Close menu' : 'Menu'}</span>
          <span className="nav-menu-icon" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
