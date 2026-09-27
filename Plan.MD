# Labmatch — Frontend Implementation Plan

## Summary
Build a polished, responsive research discovery app for University of Minnesota students. Start with a compelling landing page, then let students explore fictional professors, save research interests, and practice personalized outreach.

Keep **Labmatch** as the product name. Alternatives: **GopherLabs**, **ResearchRadar**, **ScholarMatch**, and **LabLink**.

Tagline: **“Find your people. Discover your research.”**

## Visual Direction
- Warm, editorial academic style with playful swipe interactions.
- Cream backgrounds, deep maroon actions, muted gold accents, charcoal text, subtle borders.
- Serif headlines paired with Geist; generous whitespace, rounded cards, restrained shadows, scientific SVG illustrations.
- Landing hero with layered professor preview; disciplines, three-step explanation, final call to action.
- Desktop sidebar; mobile header, bottom navigation, full-width cards.
- Accessible contrast, focus indicators, reduced-motion support.
- Independent Labmatch branding; no implied official UMN affiliation.

## Pages and Interactions
| Route | Experience |
|---|---|
| `/` | Landing page with discovery and profile calls to action. |
| `/discover` | Swipe discovery and searchable professor grid. |
| `/saved` | Saved professors, details, removal, outreach actions. |
| `/profile` | Student background and preferences. |
| `/assistant` | Simulated research chat and email drafting. |

### Discovery
- Twelve clearly fictional profiles across computing, engineering, biology, medicine, environmental research, social sciences.
- Name, department, lab, plain-language summary, topics, useful skills, sample undergraduate opportunities.
- Initials and illustrations rather than real people’s photos.
- Right swipe saves, left swipe passes; equivalent buttons, keyboard actions, latest-decision undo.
- Expanded details from cards and grid; search names, labs, summaries; discipline and topic filters.
- Rank by selected interest overlap; explain shared interests without fabricated percentages.
- Empty states and revisit-passed action. Saving is a personal shortlist, not a mutual match.

### Student Profile
- Name, major, college year, interests, coursework, skills, research goals.
- Editable topic chips, custom interests, free-text coursework and skills.
- Optional onboarding, immediate discovery, locally persisted changes, reset-demo action.

### Assistant and Outreach
- Clearly labeled simulated AI with deterministic local responses and helpful unsupported-question fallback.
- Suggested prompts for research areas, professor explanations, introductions.
- Select professor; generate editable subject and body using entered background without invented credentials.
- Save and copy drafts; clipboard failure fallback.
- Disabled “Send email — coming soon” with explanation. No actual sending.

## Implementation and Interfaces
- Existing Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4; follow installed Next.js guides.
- Static Server Component pages with interactive Client Components.
- Shared navigation, buttons, tags, cards, accessible dialogs, fields, empty states.
- Typed Professor, StudentProfile, DiscoveryDecision, ChatMessage, EmailDraft models.
- Fixtures separate from presentation; shared client state and versioned local storage.
- Read storage after hydration; malformed data recovery and memory-only fallback.
- Labmatch metadata and favicon.
- No backend, authentication, database, API routes, live AI, scraping, or email service.

## Validation and Acceptance
- Lint and production build pass.
- Landing navigation and direct route loads work.
- Swipe/buttons/keyboard/undo/filtering/saved synchronization/exhausted-deck behavior verified.
- Profile changes update ranking and explanations and survive refresh.
- Draft generation uses entered facts; edits persist; copying has a fallback.
- Blank profile, empty search/saved lists, unavailable storage handled.
- Desktop/mobile layouts and accessible dialogs inspected.
- All actions work or are labeled unavailable; fictional content and AI simulation identified.
