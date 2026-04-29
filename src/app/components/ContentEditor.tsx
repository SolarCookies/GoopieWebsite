import { useState, useEffect } from 'react';
import { Pencil, X, Save } from 'lucide-react';

interface ContentEditorProps {
  open: boolean;
  title: string;
  fields: Array<{
    key: string;
    label: string;
    multiline?: boolean;
    placeholder?: string;
    helperText?: string;
  }>;
  initial: Record<string, string>;
  onClose: () => void;
  onSave: (next: Record<string, string>) => Promise<string>;
}

/**
 * Simple modal editor for one or more text fields. Used by admins to update
 * editable site content (tagline, footer, EULA, privacy) directly in browser.
 */
export function ContentEditor({ open, title, fields, initial, onClose, onSave }: ContentEditorProps) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(initial);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const result = await onSave(values);
    setSaving(false);
    if (result === 'ok') {
      onClose();
    } else {
      setError(result);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          border: '1px solid var(--theme-border)',
          color: 'var(--theme-text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded hover:opacity-70"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium mb-1">{f.label}</label>
              {f.multiline ? (
                <textarea
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  rows={12}
                  className="w-full px-3 py-2 rounded text-sm font-mono resize-y"
                  style={{
                    backgroundColor: 'var(--theme-page-bg)',
                    color: 'var(--theme-text-primary)',
                    border: '1px solid var(--theme-border)',
                  }}
                />
              ) : (
                <input
                  type="text"
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 rounded text-sm"
                  style={{
                    backgroundColor: 'var(--theme-page-bg)',
                    color: 'var(--theme-text-primary)',
                    border: '1px solid var(--theme-border)',
                  }}
                />
              )}
              {f.helperText && (
                <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>
                  {f.helperText}
                </p>
              )}
            </div>
          ))}
        </div>

        {error && (
          <div
            className="mt-4 px-3 py-2 rounded text-sm"
            style={{ backgroundColor: 'rgba(220, 38, 38, 0.15)', color: '#fca5a5' }}
          >
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: 'var(--theme-item-selected)', color: 'var(--theme-text-primary)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{
              background: 'linear-gradient(to bottom right, var(--theme-gradient-from), var(--theme-gradient-to))',
              color: 'var(--theme-text-primary)',
            }}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Small floating "edit" button shown only to admins. Positioned via a wrapper
 * that uses `relative`.
 */
export function EditButton({ onClick, label = 'Edit' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-opacity hover:opacity-90"
      style={{
        backgroundColor: 'var(--theme-item-selected)',
        color: 'var(--theme-text-primary)',
        border: '1px solid var(--theme-border)',
      }}
    >
      <Pencil className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
