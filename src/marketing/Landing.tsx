import * as React from 'react';
import { Link } from 'react-router-dom';
import { useIsMobile } from 'lingo-ds';
import { Badge, Button, Card, EtymologyNode, Flashcard, Icon, ProgressBar, ReviewRating, StreakPill, Tag } from 'lingo-ds';
import wordmarkViolet from 'lingo-ds/assets/logo/logo-wordmark-violet.svg';
import wordmarkWhite from 'lingo-ds/assets/logo/logo-wordmark-white.svg';

/**
 * The light-theme landing page. There is deliberately no pricing surface anywhere —
 * the site sells the project, not a subscription.
 */

const SHELL = 'var(--content-max, 1120px)';

/*
 * Every band on this page is centred inside SHELL, so one definition covers
 * them all. The horizontal padding carries the safe-area insets because the
 * document is laid out edge to edge under viewport-fit=cover: in landscape the
 * notch takes a bite out of the leading edge, and 24px of padding is not
 * enough to clear it.
 */
const section: React.CSSProperties = {
  maxWidth: SHELL,
  margin: '0 auto',
  padding: '64px 24px',
  paddingLeft: 'calc(24px + env(safe-area-inset-left, 0px))',
  paddingRight: 'calc(24px + env(safe-area-inset-right, 0px))',
};
const pageGutter = (mobile: boolean): React.CSSProperties => (mobile ? { padding: '40px 20px' } : {});
/** Two-up on a real screen, stacked on a phone. */
const twoUp = (mobile: boolean): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: mobile ? 'minmax(0,1fr)' : 'minmax(0,1fr) minmax(0,1fr)',
  gap: mobile ? 'var(--space-8)' : 'var(--space-10)',
  alignItems: 'center',
});
const eyebrow: React.CSSProperties = {
  fontSize: 'var(--fs-11)', fontWeight: 800, letterSpacing: 'var(--ls-caps)',
  textTransform: 'uppercase', color: 'var(--brand)',
};
const h2: React.CSSProperties = {
  margin: '10px 0 0', fontFamily: 'var(--font-display)', fontSize: 'var(--fs-32)',
  fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1.15, letterSpacing: 'var(--ls-tight)',
};
const lede: React.CSSProperties = {
  margin: '12px 0 0', fontSize: 'var(--fs-16)', color: 'var(--text-muted)',
  lineHeight: 'var(--lh-relaxed)', maxWidth: 560,
};

const TOOLS = [
  { icon: 'layers', color: 'var(--tool-flashcards)', name: 'Flashcards', copy: 'Spaced repetition that schedules itself around the words you keep dropping.', live: true },
  { icon: 'git-branch', color: 'var(--tool-etymology)', name: 'Etymology Explorer', copy: 'Follow a word back through every language it passed through.' },
  { icon: 'spell-check', color: 'var(--tool-conjugation)', name: 'Conjugation Drill', copy: 'Forty forms in four minutes, weighted toward the ones you miss.' },
  { icon: 'message-square-quote', color: 'var(--tool-phrasebook)', name: 'Phrasebook', copy: 'Save whole phrases where they were said, not just the words.' },
  { icon: 'scroll-text', color: 'var(--tool-grammar)', name: 'Grammar Notes', copy: 'Short explanations you can pull up mid-review without losing your place.' },
];

const LANGUAGES = ['English', 'Portuguese', 'Dutch', 'Spanish'];

function Nav() {
  const isMobile = useIsMobile();
  return (
    <header
      style={{
        position: 'sticky', top: 0, zIndex: 30,
        background: 'color-mix(in oklab, var(--paper-0) 82%, transparent)',
        backdropFilter: 'var(--blur-overlay)',
        boxShadow: 'inset 0 -1px 0 var(--divider)',
        /*
         * The page asks for viewport-fit=cover, so it is laid out edge to edge
         * and everything here has to say where the edges are. The app shell and
         * the dock already did; this page never had, and the wordmark sat under
         * the notch — in landscape, where the inset is on the leading side, and
         * in the installed app, which can reach this page from About.
         *
         * The padding is on the header rather than the row inside it, so the
         * blurred background fills the unsafe strip instead of leaving a bare
         * band above a bar that starts lower down.
         */
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div
        style={{
          maxWidth: SHELL, margin: '0 auto', height: 64,
          paddingLeft: `calc(${isMobile ? '20px' : '24px'} + env(safe-area-inset-left, 0px))`,
          paddingRight: `calc(${isMobile ? '20px' : '24px'} + env(safe-area-inset-right, 0px))`,
          display: 'flex', alignItems: 'center', gap: 'var(--space-6)',
        }}
      >
        <img src={wordmarkViolet} alt="Lingo Toolbox" style={{ height: 30 }} />
        <span style={{ flex: 1 }} />
        {/* Two in-page anchors, 35px wide on a phone and sitting between the
            wordmark and the only thing anyone came here to press. The sections
            they point at are the next two screens down. */}
        {!isMobile && (
          <>
            <a href="#toolbox" style={{ fontSize: 'var(--fs-14)', fontWeight: 700, color: 'var(--text-body)', textDecoration: 'none' }}>Tools</a>
            <a href="#open-source" style={{ fontSize: 'var(--fs-14)', fontWeight: 700, color: 'var(--text-body)', textDecoration: 'none' }}>Open source</a>
          </>
        )}
        <Link to="/app" style={{ textDecoration: 'none' }}>
          <Button size="sm" iconRight={<Icon name="arrow-right" size={15} />}>Open the app</Button>
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  const isMobile = useIsMobile();
  const [flipped, setFlipped] = React.useState(false);

  return (
    <section style={{ ...section, ...pageGutter(isMobile), paddingTop: isMobile ? 32 : 72, ...twoUp(isMobile) }}>
      <div>
        <span style={eyebrow}>Open source · five tools · four languages</span>
        <h1
          style={{
            margin: '12px 0 0', fontFamily: 'var(--font-display)', fontSize: isMobile ? 'var(--fs-40)' : 'var(--fs-56, 56px)',
            fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1.05, letterSpacing: 'var(--ls-tight)',
          }}
        >
          Practise the words you nearly know.
        </h1>
        <p style={lede}>
          Lingo Toolbox isn’t another course. It’s the set of tools you open after the lesson —
          flashcards that know when to ask, and an etymology explorer that makes a word stick for good.
        </p>

        <div style={{ display: 'flex', gap: 'var(--gap-inline)', marginTop: 'var(--space-8)', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center' }}>
          <Link to="/app" style={{ textDecoration: 'none' }}>
            <Button size="lg" pill iconRight={<Icon name="arrow-right" size={17} />}>Open the app</Button>
          </Link>
          <Link to="/app/review" style={{ textDecoration: 'none' }}>
            <Button size="lg" pill variant="outline" iconLeft={<Icon name="play" size={16} />}>See a review session</Button>
          </Link>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-9)', marginTop: 'var(--space-9)', flexWrap: 'wrap' }}>
          {[
            { n: 'Local', l: 'every card stays in your browser' },
            { n: '4', l: 'starter languages' },
            { n: 'Offline', l: 'no connection needed' },
          ].map((s) => (
            <div key={s.n} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-32)', fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1 }}>{s.n}</span>
              <span style={{ fontSize: 'var(--fs-12)', color: 'var(--text-muted)' }}>{s.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* A dark product island on the light page — both theme scopes are complete,
          so either can nest inside the other. */}
      <div
        data-theme="dark"
        style={{
          background: 'var(--surface-app)', borderRadius: 'var(--radius-panel)',
          padding: 'var(--space-7)', boxShadow: 'var(--shadow-xl)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <span style={{ flex: 1, fontSize: 'var(--fs-11)', fontWeight: 800, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Everyday phrases · 12 due
          </span>
          <StreakPill days={26} size="sm" />
        </div>

        <Flashcard
          front="saudade"
          back="the presence of something absent"
          phonetic="/sɐwˈdaðɨ/"
          language="Portuguese"
          height={220}
          flipped={flipped}
          onFlip={setFlipped}
          hint={flipped ? undefined : 'Click to flip'}
          // 100, not 300 — on the violet back face, and the tag's own 18% tint lifts the
          // backdrop further, so 200 still measured 4.32. See ReviewSession.
          tags={[<Tag key="n" color="var(--violet-100)">noun</Tag>, <Tag key="b1" color="var(--violet-100)">B1</Tag>]}
        />

        <ReviewRating onGrade={() => setFlipped(false)} />
      </div>
    </section>
  );
}

function Toolbox() {
  const isMobile = useIsMobile();
  return (
    <section id="toolbox" style={section}>
      <div style={{ maxWidth: 640, marginBottom: 'var(--space-9)' }}>
        <span style={eyebrow}>The toolbox</span>
        <h2 style={h2}>Five tools, one workspace.</h2>
        <p style={lede}>
          Each tool does one thing well and shares the same deck of words, so nothing you save
          is stranded in a single exercise.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? 180 : 240}px, 1fr))`, gap: 'var(--space-5)' }}>
        {TOOLS.map((t) => (
          <Card key={t.name} accent={t.color} style={{ height: '100%' }}>
            <span style={{ color: t.color, display: 'grid', width: 28 }}>
              <Icon name={t.icon} size={26} />
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-18)', fontWeight: 800, color: 'var(--text-strong)' }}>
                {t.name}
              </span>
              {t.live && <Badge tone="success">Live</Badge>}
            </div>
            <span style={{ fontSize: 'var(--fs-13)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)' }}>{t.copy}</span>
          </Card>
        ))}
      </div>
    </section>
  );
}

function EtymologyBand() {
  const isMobile = useIsMobile();
  return (
    <section style={{ ...section, ...pageGutter(isMobile), ...twoUp(isMobile) }}>
      <div>
        <span style={eyebrow}>Etymology Explorer</span>
        <h2 style={h2}>A word sticks once you know where it’s been.</h2>
        <p style={lede}>
          Trace any word down to its root and pick up its cousins on the way.
          Add the whole chain to a deck in one click.
        </p>
      </div>
      <Card padding="var(--space-8)">
        <EtymologyNode word="saudade" language="Portuguese" era="c. 1200s" gloss="the presence of something absent" current />
        <EtymologyNode word="soidade" language="Old Portuguese" era="13th c." gloss="solitude — longing for what is gone" />
        <EtymologyNode word="sōlitātem" language="Latin" era="classical" gloss="loneliness, from sōlus — alone" connector={false} />
      </Card>
    </section>
  );
}

function FlashcardsBand() {
  const isMobile = useIsMobile();
  return (
    <section style={{ ...section, ...pageGutter(isMobile), ...twoUp(isMobile) }}>
      <Card title="Today · Everyday phrases" padding="var(--space-8)">
        <ProgressBar label="Session" valueLabel="18 / 40" value={18} max={40} />
        <ProgressBar
          label="Mastery mix"
          height={10}
          value={0}
          segments={[
            { weight: 62, color: 'var(--success)' },
            { weight: 24, color: 'var(--warning)' },
            { weight: 14, color: 'var(--surface-raised)' },
          ]}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['spaced repetition', 'reverse cards', 'leech rescue'].map((t) => (
            <Tag key={t} color="var(--tool-flashcards)">{t}</Tag>
          ))}
        </div>
      </Card>
      <div>
        <span style={eyebrow}>Flashcards</span>
        <h2 style={h2}>It asks you before you forget.</h2>
        <p style={lede}>
          Grade a card Again, Hard, Good or Easy and the schedule adjusts.
          Sessions end when you’re done, not when a lesson says so.
        </p>
        <div style={{ marginTop: 'var(--space-7)' }}>
          <Link to="/app/cards" style={{ textDecoration: 'none' }}>
            <Button iconRight={<Icon name="arrow-right" size={16} />}>Open Flashcards</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function OpenSource() {
  const isMobile = useIsMobile();
  const columns = [
    {
      badge: 'Easiest',
      title: 'Use it now',
      copy: 'Open it in a browser. Nothing to install, every tool unlocked.',
      points: ['All five tools as they ship', 'Unlimited decks and cards', 'Your data never leaves the browser'],
      cta: <Link to="/app" style={{ textDecoration: 'none' }}><Button size="sm">Open the app</Button></Link>,
    },
    {
      badge: 'Offline',
      title: 'Install it',
      copy: 'Add it to your home screen or dock and it opens like any other app.',
      points: ['Works with no connection', 'Opens in its own window', 'Still just a web page underneath'],
      cta: <Link to="/app" style={{ textDecoration: 'none' }}><Button size="sm" variant="secondary">Open, then install</Button></Link>,
    },
    {
      title: 'Fork it',
      copy: 'Add a tool, a language pack, or a better scheduler — or run your own copy.',
      points: ['MIT licensed', 'A static site you can host anywhere', 'Design system is open too'],
      cta: <a href="https://github.com/vgomx/lingotoolbox" style={{ textDecoration: 'none' }}><Button size="sm" variant="secondary">Read the repo</Button></a>,
    },
  ];

  return (
    <section id="open-source" style={section}>
      <div style={{ maxWidth: 640, marginBottom: 'var(--space-9)' }}>
        <span style={eyebrow}>Open source</span>
        <h2 style={h2}>Free, and yours to fork.</h2>
        <p style={lede}>
          Lingo Toolbox is built in the open under the MIT licence. Open it in a browser,
          install it, or fork it — there is no paid tier to unlock.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? 180 : 280}px, 1fr))`, gap: 'var(--space-5)' }}>
        {columns.map((c) => (
          <Card key={c.title} style={{ height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-18)', fontWeight: 800, color: 'var(--text-strong)' }}>{c.title}</span>
              {c.badge && <Badge tone="brand">{c.badge}</Badge>}
            </div>
            <span style={{ fontSize: 'var(--fs-13)', color: 'var(--text-muted)', lineHeight: 'var(--lh-relaxed)' }}>{c.copy}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {c.points.map((p) => (
                <span key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-13)', color: 'var(--text-body)' }}>
                  <Icon name="check" size={15} style={{ color: 'var(--success)' }} />
                  {p}
                </span>
              ))}
            </div>
            <div>{c.cta}</div>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  const isMobile = useIsMobile();
  return (
    <footer data-theme="dark" style={{ background: 'var(--ink-900)' }}>
      <div style={{
        maxWidth: SHELL, margin: '0 auto',
        // The home indicator sits over the last row otherwise.
        padding: isMobile
          ? '40px 20px calc(24px + env(safe-area-inset-bottom, 0px))'
          : '56px 24px calc(24px + env(safe-area-inset-bottom, 0px))',
        paddingLeft: `calc(${isMobile ? '20px' : '24px'} + env(safe-area-inset-left, 0px))`,
        paddingRight: `calc(${isMobile ? '20px' : '24px'} + env(safe-area-inset-right, 0px))`,
        display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0,1fr)' : '1.4fr 1fr 1fr', gap: 'var(--space-9)' }}>
        <div>
          <img src={wordmarkWhite} alt="Lingo Toolbox" style={{ height: 36 }} />
          <p style={{ margin: '16px 0 0', fontSize: 'var(--fs-14)', lineHeight: 'var(--lh-relaxed)', color: 'var(--text-muted)', maxWidth: 300 }}>
            The tools you open after the lesson. Built in the open, MIT licensed.
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'var(--space-6)' }}>
            {LANGUAGES.map((l) => <Tag key={l} color="var(--violet-300)">{l}</Tag>)}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 'var(--fs-11)', fontWeight: 800, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-5)' }}>
            Tools
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {TOOLS.map((t) => (
              <span key={t.name} style={{ fontSize: 'var(--fs-14)', color: 'var(--text-body)' }}>{t.name}</span>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 'var(--fs-11)', fontWeight: 800, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-5)' }}>
            Project
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a href="https://github.com/vgomx/lingotoolbox" style={{ fontSize: 'var(--fs-14)', color: 'var(--text-body)', textDecoration: 'none' }}>App repository</a>
            <a href="https://github.com/vgomx/lingo-ds" style={{ fontSize: 'var(--fs-14)', color: 'var(--text-body)', textDecoration: 'none' }}>Design system</a>
            <a href="https://vgomx.github.io/lingo-ds/" style={{ fontSize: 'var(--fs-14)', color: 'var(--text-body)', textDecoration: 'none' }}>Component showcase</a>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: SHELL, margin: '0 auto',
        padding: '20px 24px calc(40px + env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'calc(24px + env(safe-area-inset-left, 0px))',
        paddingRight: 'calc(24px + env(safe-area-inset-right, 0px))',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,.06)',
      }}>
        <span style={{ fontSize: 'var(--fs-13)', color: 'var(--text-muted)' }}>
          MIT licence · Icons by Lucide (ISC) · Illustration by OpenMoji (CC BY-SA 4.0)
        </span>
      </div>
    </footer>
  );
}

export function Landing() {
  // The landing page is always light regardless of the app's theme preference.
  // It scopes itself rather than setting data-theme on <html>, because the store
  // owns that attribute — and because both scopes are complete, so either nests
  // inside the other (the hero island and footer below are dark within this one).
  return (
    <div data-theme="light" style={{ background: 'var(--paper-0)', minHeight: '100vh' }}>
      <Nav />
      <Hero />
      <Toolbox />
      <EtymologyBand />
      <FlashcardsBand />
      <OpenSource />
      <Footer />
    </div>
  );
}
