import { useState } from 'react';
import { Link } from 'react-router';
import { ContentEditor, EditButton } from './ContentEditor';
import { useSiteContent } from '../data/useSiteContent';

interface FooterProps {
  isInCEF?: boolean;
  onOpenExternal?: (url: string) => void;
}

const DEFAULT_COPYRIGHT_TEMPLATE = '© {year} Goopie. Not affiliated with any game studio or Microsoft.';

export function Footer({ isInCEF, onOpenExternal }: FooterProps) {
  const year = new Date().getFullYear();
  const copyright = useSiteContent<{ text: string }>('footerCopyright', { text: DEFAULT_COPYRIGHT_TEMPLATE });
  const [editorOpen, setEditorOpen] = useState(false);

  const renderedCopyright = (copyright.value.text || DEFAULT_COPYRIGHT_TEMPLATE).replace(
    '{year}',
    String(year),
  );

  return (
    <footer
      className="sticky bottom-0 z-30 border-t mt-auto px-4 md:px-8 py-4 text-xs flex flex-col md:flex-row items-center justify-between gap-2"
      style={{
        backgroundColor: 'var(--theme-topbar-bg)',
        borderColor: 'var(--theme-border)',
        color: 'var(--theme-text-muted)',
        backdropFilter: 'var(--theme-backdrop-blur)',
        WebkitBackdropFilter: 'var(--theme-backdrop-blur)',
      }}
    >
      <span className="flex items-center gap-2">
        <span>{renderedCopyright}</span>
        {copyright.isAdmin && <EditButton onClick={() => setEditorOpen(true)} label="Edit" />}
      </span>
      <span className="flex items-center gap-3 flex-wrap justify-center">
        <Link to="/eula" className="hover:underline">EULA</Link>
        <Link to="/privacy" className="hover:underline">Privacy</Link>
        <a
          href="https://github.com/rexglue/rexglue-sdk"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
          onClick={(e) => {
            if (isInCEF && onOpenExternal) {
              e.preventDefault();
              onOpenExternal('https://github.com/rexglue/rexglue-sdk');
            }
          }}
        >
          Powered by rexglue-sdk
        </a>
      </span>

      <ContentEditor
        open={editorOpen}
        title="Edit footer copyright"
        fields={[
          {
            key: 'text',
            label: 'Copyright text',
            placeholder: DEFAULT_COPYRIGHT_TEMPLATE,
            helperText: 'Use {year} as a placeholder for the current year.',
          },
        ]}
        initial={{ text: copyright.value.text || DEFAULT_COPYRIGHT_TEMPLATE }}
        onClose={() => setEditorOpen(false)}
        onSave={(vals) => copyright.save({ text: vals.text })}
      />
    </footer>
  );
}
