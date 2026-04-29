import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Markdown } from '../components/Markdown';
import { ContentEditor, EditButton } from '../components/ContentEditor';
import { useSiteContent } from '../data/useSiteContent';

const DEFAULT_TITLE = 'End-User License Agreement (EULA)';
const DEFAULT_LAST_UPDATED = 'March 31, 2026';
const DEFAULT_BODY = `## 1. Acceptance of Terms

By using this application, you agree to be bound by this End-User License Agreement. If you do not agree, do not use the application.

## 3. Restrictions

- You may not use this application for any illegal purpose, including piracy.

## 4. Intellectual Property

All game titles, logos, and trademarks displayed in this application are the property of their respective owners. We are not affiliated with any game studio or Microsoft.

## 5. Disclaimer of Warranties

This application is provided "as is" without warranties of any kind, express or implied. We do not guarantee that the application will be error-free or uninterrupted.

## 6. Limitation of Liability

In no event shall we be liable for any indirect, incidental, special, or consequential damages arising out of or in connection with your use of this application.

## 7. Termination

We may terminate or suspend your access at any time, without prior notice, for any reason.

## 8. Contact

If you have any questions about this EULA, please reach out to me on discord @SolarCookies.`;

interface EulaContent {
  title: string;
  lastUpdated: string;
  body: string;
}

export function Eula() {
  const { value, isAdmin, save } = useSiteContent<EulaContent>('eula', {
    title: DEFAULT_TITLE,
    lastUpdated: DEFAULT_LAST_UPDATED,
    body: DEFAULT_BODY,
  });
  const [editorOpen, setEditorOpen] = useState(false);

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: 'var(--theme-page-bg)', color: 'var(--theme-text-primary)' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 mb-8 text-sm hover:underline" style={{ color: 'var(--theme-accent)' }}>
          <ArrowLeft className="w-4 h-4" /> Back to Library
        </Link>

        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <h1 className="text-3xl font-bold">{value.title || DEFAULT_TITLE}</h1>
          {isAdmin && <EditButton onClick={() => setEditorOpen(true)} label="Edit EULA" />}
        </div>
        <p className="text-sm mb-8" style={{ color: 'var(--theme-text-muted)' }}>
          Last updated: {value.lastUpdated || DEFAULT_LAST_UPDATED}
        </p>

        <Markdown source={value.body || DEFAULT_BODY} />
      </div>

      <ContentEditor
        open={editorOpen}
        title="Edit End-User License Agreement"
        fields={[
          { key: 'title', label: 'Title', placeholder: DEFAULT_TITLE },
          { key: 'lastUpdated', label: 'Last updated', placeholder: DEFAULT_LAST_UPDATED },
          {
            key: 'body',
            label: 'Body',
            multiline: true,
            placeholder: DEFAULT_BODY,
            helperText: 'Supports basic Markdown: # / ## / ### headings, - bullets, **bold**, *italic*, `code`, [links](url).',
          },
        ]}
        initial={{
          title: value.title || DEFAULT_TITLE,
          lastUpdated: value.lastUpdated || DEFAULT_LAST_UPDATED,
          body: value.body || DEFAULT_BODY,
        }}
        onClose={() => setEditorOpen(false)}
        onSave={(vals) =>
          save({
            title: vals.title,
            lastUpdated: vals.lastUpdated,
            body: vals.body,
          } as Partial<EulaContent>)
        }
      />
    </div>
  );
}
