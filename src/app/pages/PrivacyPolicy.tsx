import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Markdown } from '../components/Markdown';
import { ContentEditor, EditButton } from '../components/ContentEditor';
import { useSiteContent } from '../data/useSiteContent';

const DEFAULT_TITLE = 'Privacy Policy';
const DEFAULT_LAST_UPDATED = 'March 31, 2026';
const DEFAULT_BODY = `## 1. Information We Collect

We may collect the following types of information when you use the application:

- Account information (e.g. email address, username) when you sign in.
- Usage data such as which features you interact with.

## 2. How We Use Your Information

- To provide and maintain the application.
- To manage your account and preferences.
- To know which permissions you have granted for editing games.

## 3. Data Sharing

We do not sell, trade, or rent your personal information to third parties. We may share data only when required by law.

## 4. Data Storage

Your data is stored using Firebase services provided by Google. We take reasonable measures to protect your information, but no method of transmission or storage is 100% secure.

## 5. Your Rights

You may request deletion of your account and associated data at any time by contacting me on discord @SolarCookies.

## 6. Cookies & Local Storage

The application may use local storage or cookies to persist your preferences and authentication session.

## 7. Changes to This Policy

We may update this Privacy Policy from time to time. Continued use of the application after changes constitutes acceptance of the revised policy.

## 8. Contact

If you have questions about this Privacy Policy, please reach out to me on discord @SolarCookies.`;

interface PrivacyContent {
  title: string;
  lastUpdated: string;
  body: string;
}

export function PrivacyPolicy() {
  const { value, isAdmin, save } = useSiteContent<PrivacyContent>('privacy', {
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
          {isAdmin && <EditButton onClick={() => setEditorOpen(true)} label="Edit Privacy" />}
        </div>
        <p className="text-sm mb-8" style={{ color: 'var(--theme-text-muted)' }}>
          Last updated: {value.lastUpdated || DEFAULT_LAST_UPDATED}
        </p>

        <Markdown source={value.body || DEFAULT_BODY} />
      </div>

      <ContentEditor
        open={editorOpen}
        title="Edit Privacy Policy"
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
          } as Partial<PrivacyContent>)
        }
      />
    </div>
  );
}
