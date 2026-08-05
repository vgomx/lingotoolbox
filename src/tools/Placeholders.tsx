import { Button, Icon } from 'lingo-ds';
import { Link } from 'react-router-dom';
import { useChrome } from '../shell/chrome';
import { EmptyTool } from './EmptyTool';
import { TOOLS, type ToolId } from '../data/seed';

/**
 * The four tools that are designed but not built. Each gets a real screen rather
 * than a dead route, and each says what it will do for the learner and where to
 * go meanwhile — not what state the codebase is in, which is no use to them.
 *
 * All of it comes off the TOOLS entry so the label, icon, accent and blurb can
 * never drift from the rail and the home screen.
 */
function ComingSoon({ id }: { id: ToolId }) {
  const tool = TOOLS.find((t) => t.id === id)!;

  useChrome({ title: tool.label, titleIcon: tool.icon, sidebar: false });

  return (
    <>
      <EmptyTool
        icon={tool.icon}
        accent={tool.accent}
        title="Coming soon"
        description={`${tool.blurb} Flashcards is ready to use today.`}
        action={
          <Link to="/app/cards" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" iconLeft={<Icon name="layers" size={16} />}>Open Flashcards</Button>
          </Link>
        }
      />
    </>
  );
}

export const EtymologyScreen = () => <ComingSoon id="etymology" />;
export const ConjugationScreen = () => <ComingSoon id="conjugation" />;
export const PhrasebookScreen = () => <ComingSoon id="phrasebook" />;
export const GrammarScreen = () => <ComingSoon id="grammar" />;
