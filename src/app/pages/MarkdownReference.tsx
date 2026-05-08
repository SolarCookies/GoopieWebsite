import { Sidebar, SIDEBAR_WIDTH_CLASS } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';
import { Markdown } from '../components/Markdown';

function Section({ title, preview, code }: { title: string; preview: string; code: string }) {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-bold mb-3 pb-1 border-b" style={{ color: 'var(--theme-text-primary)', borderColor: 'var(--theme-border)' }}>
        {title}
      </h2>
      <div className="mb-3" style={{ color: 'var(--theme-text-secondary)' }}>
        <Markdown source={preview} />
      </div>
      <pre
        className="p-3 rounded-lg overflow-x-auto text-xs font-mono whitespace-pre-wrap"
        style={{ backgroundColor: 'color-mix(in srgb, var(--theme-page-bg) 80%, black)', border: '1px solid var(--theme-border)', color: 'var(--theme-text-muted)' }}
      >
        {code}
      </pre>
    </div>
  );
}


export function MarkdownReference() {
  return (
    <div className={`flex h-screen flex-col relative ${SIDEBAR_WIDTH_CLASS}`} style={{ backgroundColor: 'var(--theme-page-bg)' }}>
      <Sidebar />
      <div className="relative z-20">
        <TopBar searchQuery="" onSearchChange={() => {}} />
      </div>
      <div className="flex-1 overflow-y-auto relative z-10 p-6 md:p-10">
        <div className="max-w-3xl mx-auto w-full">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--theme-text-primary)' }}>Markdown Reference</h1>
          <p className="mb-8 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
            All formatting supported in game descriptions. Each section shows the rendered output above and the raw syntax below.
          </p>

          <Section
            title="Headings"
            preview={`# Heading 1\n## Heading 2\n### Heading 3`}
            code={`# Heading 1\n## Heading 2\n### Heading 3`}
          />

          <Section
            title="Bold, Italic & Strikethrough"
            preview={`**Bold text**, *italic text*, and ~~strikethrough text~~.\n\n**bold and *italic* combined** or ***all three at once***.`}
            code={`**Bold text**, *italic text*, and ~~strikethrough text~~.\n\n**bold and *italic* combined** or ***all three at once***.`}
          />

          <Section
            title="Inline Code"
            preview={"Use `inline code` for things like `recompName` or file paths."}
            code={"Use `inline code` for things like `recompName` or file paths."}
          />

          <Section
            title="Links"
            preview={`[Visit goopie.xyz](https://goopie.xyz)`}
            code={`[Link text](https://example.com)`}
          />

          <Section
            title="Horizontal Rule"
            preview={`Above the line\n\n---\n\nBelow the line`}
            code={`---`}
          />

          <Section
            title="Unordered List"
            preview={`- First item\n- Second item\n- Third item`}
            code={`- First item\n- Second item\n- Third item`}
          />

          <Section
            title="Ordered List"
            preview={`1. First step\n2. Second step\n3. Third step`}
            code={`1. First step\n2. Second step\n3. Third step`}
          />

          <Section
            title="Blockquote"
            preview={`> This is a regular blockquote.\n> It can span multiple lines.`}
            code={`> This is a regular blockquote.\n> It can span multiple lines.`}
          />

          <Section
            title="Alert: NOTE"
            preview={`> [!NOTE]\n> Useful information that users should know, even when skimming.`}
            code={`> [!NOTE]\n> Your message here.`}
          />

          <Section
            title="Alert: TIP"
            preview={`> [!TIP]\n> Helpful advice for doing things better or more easily.`}
            code={`> [!TIP]\n> Your message here.`}
          />

          <Section
            title="Alert: WARNING"
            preview={`> [!WARNING]\n> Urgent info that needs immediate user attention to avoid problems.`}
            code={`> [!WARNING]\n> Your message here.`}
          />

          <Section
            title="Alert: IMPORTANT"
            preview={`> [!IMPORTANT]\n> Key information users need to know to achieve their goal.`}
            code={`> [!IMPORTANT]\n> Your message here.`}
          />

          <Section
            title="Alert: CAUTION"
            preview={`> [!CAUTION]\n> Advises about risks or negative outcomes of certain actions.`}
            code={`> [!CAUTION]\n> Your message here.`}
          />

          <Section
            title="Fenced Code Block"
            preview={"```\nThis is a fenced code block.\nIt preserves whitespace.\n    Indented line\n```"}
            code={"```\nYour code here\n```"}
          />

          <Section
            title="Image (Markdown syntax)"
            preview={`![Sample image](https://placehold.co/200x80)`}
            code={`![Alt text](https://example.com/image.png)`}
          />

          <Section
            title="Image (HTML tag)"
            preview={`<img src="https://placehold.co/200x80" alt="Sample image" width="200" height="80" />`}
            code={`<img src="https://example.com/image.png" alt="Alt text" width="300" height="200" />`}
          />

          <Section
            title="Video (YouTube or direct URL)"
            preview={`!video[Rick Astley](https://www.youtube.com/watch?v=dQw4w9WgXcQ)`}
            code={`!video[Caption](https://www.youtube.com/watch?v=VIDEO_ID)\n!video[Caption](https://example.com/video.mp4)`}
          />

          <Section
            title="Audio"
            preview={`!audio[Sample clip](https://www.w3schools.com/html/horse.mp3)`}
            code={`!audio[Caption](https://example.com/audio.mp3)`}
          />
        </div>
      </div>
    </div>
  );
}
