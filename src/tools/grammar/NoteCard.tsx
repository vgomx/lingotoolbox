import { Card, Icon, IconButton, Tag, Tooltip } from 'lingo-ds';
import type { Note } from '../../data/types';
import { Highlight } from './Highlight';

/**
 * One note, read rather than reviewed.
 *
 * The examples carry the weight — a rule stated in prose is something you nod
 * at, a rule shown twice with the difference between the two is something you
 * can use. So they get the mono face and their own row, the way a card's
 * phonetic does, instead of being folded into the paragraph.
 */
export function NoteCard({ note, onEdit, onDelete, highlight = '' }: {
  note: Note;
  onEdit?: () => void;
  onDelete?: () => void;
  /** The current search, marked wherever it appears. */
  highlight?: string;
}) {
  return (
    <Card
      title={<Highlight text={note.title} query={highlight} />}
      actions={onEdit && onDelete ? (
        <>
          <Tooltip label="Edit note">
            <IconButton label="Edit note" size="sm" onClick={onEdit}><Icon name="pencil" size={15} /></IconButton>
          </Tooltip>
          <Tooltip label="Delete note">
            <IconButton label="Delete note" size="sm" variant="danger" sound={false} onClick={onDelete}>
              <Icon name="trash-2" size={15} />
            </IconButton>
          </Tooltip>
        </>
      ) : undefined}
    >
      {/* Split on blank lines rather than rendered as markdown. A note is a few
          sentences; a renderer would be more machinery than the content. */}
      {note.body.split('\n\n').map((para, i) => (
        <p
          key={i}
          style={{ margin: 0, fontSize: 'var(--fs-14)', color: 'var(--text-body)', lineHeight: 'var(--lh-relaxed)' }}
        >
          <Highlight text={para} query={highlight} />
        </p>
      ))}

      {note.examples && note.examples.length > 0 && (
        <div
          style={{
            display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
            padding: 'var(--space-5)', borderRadius: 'var(--radius-md)',
            background: 'var(--surface-sunken)',
          }}
        >
          {note.examples.map((ex) => (
            <div key={ex.form} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 'var(--space-4)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-13)', color: 'var(--text-strong)' }}>
                {ex.form}
              </span>
              <span style={{ fontSize: 'var(--fs-13)', color: 'var(--text-muted)' }}>{ex.gloss}</span>
            </div>
          ))}
        </div>
      )}

      {(note.level || note.tags.length > 0) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {note.level && (
            <Tag color="var(--text-muted)" style={{ fontFamily: 'var(--font-mono)' }}>{note.level}</Tag>
          )}
          {note.tags.map((t) => <Tag key={t} color="var(--tool-grammar)">{t}</Tag>)}
        </div>
      )}
    </Card>
  );
}
