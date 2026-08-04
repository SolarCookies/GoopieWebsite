import type { Game, HiddenCVar } from '../../types/game';
import { X, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { EditorSection } from './EditorSection';
import { inputStyle, labelStyle } from './editorStyles';

interface Props {
  form: Game;
  update: <K extends keyof Game>(key: K, value: Game[K]) => void;
  readOnly: boolean;
}

type HiddenCVarType = HiddenCVar['type'];

interface RowProps {
  cv: HiddenCVar;
  i: number;
  updateCv: (i: number, patch: Partial<HiddenCVar>) => void;
  removeCv: (i: number) => void;
  readOnly: boolean;
}

function HiddenCVarRow({ cv, i, updateCv, removeCv, readOnly }: RowProps) {
  const tagError = cv.tag && !/^[A-Za-z0-9_]+$/.test(cv.tag);

  return (
    <div className="rounded-md border p-3" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-page-bg)' }}>
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-7 md:col-span-4">
          <label className="text-xs mb-1 block" style={labelStyle}>Tag</label>
          <Input
            value={cv.tag}
            onChange={e => updateCv(i, { tag: e.target.value.replace(/[^A-Za-z0-9_]/g, '') })}
            placeholder="debugmode"
            style={tagError ? { ...inputStyle, borderColor: '#ef4444' } : inputStyle}
            disabled={readOnly}
          />
        </div>
        <div className="col-span-5 md:col-span-3">
          <label className="text-xs mb-1 block" style={labelStyle}>Type</label>
          <Select
            value={cv.type}
            onValueChange={v => {
              const t = v as HiddenCVarType;
              updateCv(i, { type: t, value: t === 'Bool' ? false : t === 'String' ? '' : 0 });
            }}
            disabled={readOnly}
          >
            <SelectTrigger className="w-full rounded-md text-sm border" style={inputStyle}><SelectValue /></SelectTrigger>
            <SelectContent style={inputStyle}>
              <SelectItem value="Int">Int</SelectItem>
              <SelectItem value="Float">Float</SelectItem>
              <SelectItem value="Bool">Bool</SelectItem>
              <SelectItem value="String">String</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-10 md:col-span-4">
          <label className="text-xs mb-1 block" style={labelStyle}>Value</label>
          {cv.type === 'Bool' ? (
            <Select value={cv.value ? 'true' : 'false'} onValueChange={v => updateCv(i, { value: v === 'true' })} disabled={readOnly}>
              <SelectTrigger className="w-full rounded-md text-sm border" style={inputStyle}><SelectValue /></SelectTrigger>
              <SelectContent style={inputStyle}>
                <SelectItem value="false">false</SelectItem>
                <SelectItem value="true">true</SelectItem>
              </SelectContent>
            </Select>
          ) : cv.type === 'String' ? (
            <Input
              value={typeof cv.value === 'string' ? cv.value : ''}
              onChange={e => updateCv(i, { value: e.target.value })}
              placeholder="value"
              style={inputStyle}
              disabled={readOnly}
            />
          ) : (
            <Input
              type="number"
              step={cv.type === 'Float' ? 'any' : '1'}
              value={typeof cv.value === 'number' ? cv.value : 0}
              onChange={e => {
                const n = e.target.value === '' ? 0 : Number(e.target.value);
                if (!isFinite(n)) return;
                updateCv(i, { value: cv.type === 'Int' ? Math.trunc(n) : n });
              }}
              style={inputStyle}
              disabled={readOnly}
            />
          )}
        </div>
        {!readOnly && (
          <div className="col-span-2 md:col-span-1 flex items-end justify-end">
            <Button
              type="button"
              size="sm"
              onClick={() => removeCv(i)}
              className="bg-red-600 hover:bg-red-700 text-white"
              title="Remove hidden cvar"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
      {tagError && <p className="text-red-500 text-xs mt-2">Tag must be letters, digits, or underscores only.</p>}
    </div>
  );
}

export function EditorHiddenCVars({ form, update, readOnly }: Props) {
  const hiddenCvars = form.hiddenCvars || [];

  const updateCv = (i: number, patch: Partial<HiddenCVar>) => {
    const next = [...hiddenCvars];
    const merged = { ...next[i], ...patch };
    for (const key of Object.keys(merged) as (keyof HiddenCVar)[]) {
      if (merged[key] === undefined) delete merged[key];
    }
    next[i] = merged as HiddenCVar;
    update('hiddenCvars', next);
  };

  return (
    <EditorSection title="Hidden CVars">
      <p className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>
        Fixed variables sent to the game on launch as{' '}
        <code className="mx-1 px-1 rounded" style={{ backgroundColor: 'var(--theme-page-bg)' }}>-tag value</code>
        pairs, the same way as Launcher CVars. Unlike Launcher CVars, these never appear in the player-facing
        Settings panel and the player can never change their value.
      </p>

      <div className="space-y-3">
        {hiddenCvars.map((cv, i) => (
          <HiddenCVarRow
            key={cv.id}
            cv={cv}
            i={i}
            updateCv={updateCv}
            removeCv={i => update('hiddenCvars', hiddenCvars.filter((_, j) => j !== i))}
            readOnly={readOnly}
          />
        ))}
      </div>

      {!readOnly && (
        <Button
          type="button"
          size="sm"
          className="text-white"
          style={{ backgroundColor: 'var(--theme-item-selected)' }}
          onClick={() => update('hiddenCvars', [...hiddenCvars, { id: crypto.randomUUID(), tag: '', type: 'Bool', value: false }])}
        >
          <Plus className="w-4 h-4 mr-1" /> Add Hidden CVar
        </Button>
      )}
    </EditorSection>
  );
}
