import * as React from 'react';
import { Button, Dialog, Icon, IconButton, Input, Select, TagInput, Textarea, Tooltip, playSound, useIsMobile } from 'lingo-ds';
import { TopRight, useChrome } from '../../shell/chrome';
import { useStore } from '../../state/store';
import { ConfirmDialog } from '../../shell/ConfirmDialog';
import { EmptyTool } from '../EmptyTool';
import { NoteCard } from './NoteCard';
import { CEFR_LEVELS, asLevel } from '../../data/types';
import type { CEFRLevel, Note } from '../../data/types';

const page: React.CSSProperties = {
  maxWidth: 'var(--content-max, 1120px)',
  margin: '0 auto',
  padding: 'var(--space-8) var(--space-7) var(--space-10)',
};

/**
 * The rules you keep having to look up, for the workspace you are in.
 *
 * No scheduler and no queue. A grammar note is something you read at the moment
 * it is in your way and then stop thinking about — putting these in a review
 * rotation would be asking someone to recite rules rather than use them. The
 * half that earns the tool is the button this puts on the review screen.
 */
export function GrammarNotes() {
  const { notes, cards, saveNote, removeNote, workspace, language } = useStore();
  const isMobile = useIsMobile();

  const [search, setSearch] = React.useState('');
  const [editing, setEditing] = React.useState<Note | null>(null);
  const [open, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Note | null>(null);

  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);
  const [level, setLevel] = React.useState<CEFRLevel | ''>('');

  useChrome({ title: 'Grammar Notes', titleIcon: 'scroll-text' });

  /**
   * Every tag already in use, commonest first.
   *
   * Cards before notes, and by frequency rather than alphabetically: the tag
   * on forty cards is the one worth reaching for, and the one on a single note
   * is how the vocabulary splinters.
   */
  const tagsInUse = React.useMemo(() => {
    const count = new Map<string, number>();
    for (const c of cards) for (const t of c.tags) count.set(t, (count.get(t) ?? 0) + 1);
    for (const n of notes) for (const t of n.tags) count.set(t, (count.get(t) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [cards, notes]);

  const shown = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) =>
      n.title.toLowerCase().includes(q)
      || n.body.toLowerCase().includes(q)
      || n.tags.some((t) => t.toLowerCase().includes(q)));
  }, [notes, search]);

  const openNew = () => {
    setEditing(null); setTitle(''); setBody(''); setTags([]); setLevel(''); setOpen(true);
  };
  const openEdit = (note: Note) => {
    setEditing(note);
    setTitle(note.title); setBody(note.body);
    setTags(note.tags); setLevel(note.level ?? '');
    setOpen(true);
  };

  const submit = async () => {
    if (!title.trim() || !body.trim()) return;
    // Lowercased here rather than in the field, so what you typed is what
    // you see while typing it, and the stored form stays canonical.
    const parsed = [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
    const now = Date.now();
    await saveNote({
      id: editing?.id ?? `note-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      language,
      title: title.trim(),
      body: body.trim(),
      // Examples are seeded rather than authored here. Writing a form-and-gloss
      // editor for a field most notes use twice would be more dialog than note.
      examples: editing?.examples,
      tags: parsed,
      level: level || undefined,
      createdAt: editing?.createdAt ?? now,
    });
    playSound('cardAdded');
    setOpen(false);
  };

  return (
    <>
      <TopRight>
        <Tooltip label="New note">
          <IconButton label="New note" onClick={openNew}><Icon name="plus" size={18} /></IconButton>
        </Tooltip>
      </TopRight>

      <div style={page}>
        <header style={{ marginBottom: 'var(--space-7)' }}>
          <span
            style={{
              fontSize: 'var(--fs-11)', fontWeight: 800, letterSpacing: 'var(--ls-caps)',
              textTransform: 'uppercase', color: 'var(--text-muted)',
            }}
          >
            {workspace.name} · {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </span>
          <h1
            style={{
              margin: '6px 0 0', fontFamily: 'var(--font-display)', fontSize: 'var(--fs-32)',
              fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1.15,
            }}
          >
            The rules worth looking up
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: 'var(--fs-14)', color: 'var(--text-muted)', maxWidth: 560, lineHeight: 'var(--lh-relaxed)' }}>
            Short explanations, tagged the way your cards are — so a note about
            nouns turns up while you are reviewing one.
          </p>

          {/* Was `sm` in a 360px box, which is the size of a filter tucked into
              a toolbar rather than of the main way into a screen — and on a
              phone it left a 28px target. */}
          {notes.length > 0 && (
            <div style={{ marginTop: 'var(--space-6)', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <Input
                placeholder="Search notes, or a word inside one…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                iconLeft={<Icon name="search" size={16} />}
                iconRight={search ? (
                  <IconButton label="Clear search" size="sm" onClick={() => setSearch('')}>
                    <Icon name="x" size={14} />
                  </IconButton>
                ) : undefined}
              />
              {/* Says the filter did something, which an empty-handed grid
                  otherwise leaves you guessing about. */}
              {search.trim() && (
                <span style={{ fontSize: 'var(--fs-12)', color: 'var(--text-muted)' }}>
                  {shown.length === 0
                    ? 'No matches'
                    : `${shown.length} of ${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`}
                </span>
              )}
            </div>
          )}
        </header>

        {notes.length === 0 ? (
          <EmptyTool
            icon="scroll-text"
            accent="var(--tool-grammar)"
            title="No notes yet"
            description="A note is a rule in a few sentences — the kind you keep looking up mid-review."
            action={<Button onClick={openNew} iconLeft={<Icon name="plus" size={16} />}>Write a note</Button>}
          />
        ) : shown.length === 0 ? (
          <EmptyTool
            icon="search"
            accent="var(--tool-grammar)"
            title="Nothing matches that"
            description={`No ${workspace.name} note mentions “${search.trim()}”.`}
            action={<Button variant="secondary" onClick={() => setSearch('')}>Clear the search</Button>}
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-6)', alignItems: 'start' }}>
            {shown.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                highlight={search}
                onEdit={() => openEdit(note)}
                onDelete={() => setDeleting(note)}
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleting}
        title={`Delete “${deleting?.title ?? ''}”?`}
        description="The note goes. Nothing else refers to it, and no card depends on it."
        confirmLabel="Delete note"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) void removeNote(deleting.id);
          setDeleting(null);
        }}
      />

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit note' : 'New note'}
        description="Short enough to read halfway through a review."
        width={520}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button sound={false} onClick={submit} disabled={!title.trim() || !body.trim()}>
              {editing ? 'Save note' : 'Add note'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', paddingBottom: 'var(--space-4)' }}>
          <Input
            label="Title"
            hint="Phrase it as the question it answers — “de or het?”"
            placeholder="de or het?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {/* A Textarea because the hint asks for a blank line between
              paragraphs, and a single-line Input cannot take that advice — the
              seeded notes had paragraphs that nobody could have typed. */}
          <Textarea
            label="Explanation"
            hint="A few sentences. Leave a blank line between paragraphs."
            placeholder="Roughly two thirds of nouns take de…"
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {/* Suggestions are the point, not decoration. A note reaches a card
              by sharing a tag with it, so a tag nobody else uses is a note
              nobody will be shown — and a free-text field is exactly how
              `verb` and `verbs` both came to exist in the seed. */}
          <TagInput
            label="Tags"
            hint="What decides which cards offer this note. Reuse a word your cards already use."
            placeholder="noun"
            color="var(--tool-grammar)"
            value={tags}
            onChange={setTags}
            suggestions={tagsInUse}
          />
          <Select
            label="Level"
            value={level}
            options={[{ value: '', label: 'Ungraded' }, ...CEFR_LEVELS]}
            onChange={(v) => setLevel(asLevel(v) ?? '')}
          />
        </div>
      </Dialog>
    </>
  );
}
