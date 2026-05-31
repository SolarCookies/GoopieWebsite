/**
 * Tiny dependency-free renderer for the limited subset of Markdown we use in
 * editable site content (EULA, Privacy, news posts). Supported syntax:
 *
 *   # Heading 1
 *   ## Heading 2
 *   ### Heading 3
 *   - bullet
 *   blank line  → paragraph break
 *
 * Block media (must be on their own line):
 *   ![alt](https://...image.png)         → <img>
 *   !video[caption](https://...mp4)      → <video> or YouTube/Vimeo iframe
 *   !audio[caption](https://...mp3)      → <audio>
 *
 * Inline: **bold**, *italic*, `code`, [text](url), ![alt](url).
 *
 * Inline: **bold**, *italic*, ~~strikethrough~~, `code`, [text](url), ![alt](url).
 *
 * Additional block types:
 *   1. ordered list item
 *   > blockquote
 *   ---                              → horizontal rule
 *   ```lang / ```                    → fenced code block
 *
 * Only https URLs are accepted for media to avoid mixed-content and
 * unsafe schemes. Output never injects raw HTML, so user-authored
 * content is safe to render.
 */
import { Fragment, type ReactNode } from 'react';
import { isInLauncher, openExternal } from '../utils/externalLink';

const SAFE_URL = /^https:\/\/[^\s)]+$/i;

function isSafeUrl(url: string): boolean {
  return SAFE_URL.test(url);
}

function youTubeEmbed(url: string): string | null {
  // https://www.youtube.com/watch?v=ID  |  https://youtu.be/ID  |  /embed/ID
  const m =
    /^https:\/\/(?:www\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([\w-]{6,})/i.exec(url) ||
    /^https:\/\/youtu\.be\/([\w-]{6,})/i.exec(url) ||
    /^https:\/\/(?:www\.)?youtube\.com\/embed\/([\w-]{6,})/i.exec(url);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function vimeoEmbed(url: string): string | null {
  const m = /^https:\/\/(?:www\.)?vimeo\.com\/(\d{5,})/i.exec(url);
  return m ? `https://player.vimeo.com/video/${m[1]}` : null;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  // Tokenise inline markup. Order matters — code first to avoid eating other
  // markup inside backticks.
  const out: ReactNode[] = [];
  let remaining = text;
  let i = 0;
  const patterns: { regex: RegExp; render: (m: RegExpExecArray, k: string) => ReactNode }[] = [
    {
      regex: /`([^`]+)`/,
      render: (m, k) => (
        <code
          key={k}
          className="px-1 py-0.5 rounded text-[0.9em]"
          style={{ backgroundColor: 'var(--theme-card-bg)', border: '1px solid var(--theme-border)' }}
        >
          {m[1]}
        </code>
      ),
    },
    {
      regex: /\*\*([^*]+)\*\*/,
      render: (m, k) => <strong key={k}>{m[1]}</strong>,
    },
    {
      regex: /\*([^*]+)\*/,
      render: (m, k) => <em key={k}>{m[1]}</em>,
    },
    {
      regex: /~~([^~]+)~~/,
      render: (m, k) => <s key={k}>{m[1]}</s>,
    },
    {
      regex: /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/,
      render: (m, k) => {
        const url = m[2];
        return (
          <a
            key={k}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
            style={{ color: 'var(--theme-accent)' }}
            onClick={(e) => {
              // Inside a launcher, target=_blank navigations are dropped by the
              // webview.  Route through the bridge so the system browser opens.
              if (isInLauncher()) {
                e.preventDefault();
                openExternal(url);
              }
            }}
          >
            {m[1]}
          </a>
        );
      },
    },
    {
      regex: /!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)/,
      render: (m, k) => (
        <img
          key={k}
          src={m[2]}
          alt={m[1]}
          loading="lazy"
          className="inline-block max-h-6 align-middle mx-1 rounded"
        />
      ),
    },
  ];

  while (remaining.length > 0) {
    let earliest: { idx: number; match: RegExpExecArray; render: (m: RegExpExecArray, k: string) => ReactNode } | null = null;
    for (const p of patterns) {
      const m = p.regex.exec(remaining);
      if (m && (earliest == null || m.index < earliest.idx)) {
        earliest = { idx: m.index, match: m, render: p.render };
      }
    }
    if (!earliest) {
      out.push(<Fragment key={`${keyPrefix}-t-${i++}`}>{remaining}</Fragment>);
      break;
    }
    if (earliest.idx > 0) {
      out.push(<Fragment key={`${keyPrefix}-t-${i++}`}>{remaining.slice(0, earliest.idx)}</Fragment>);
    }
    out.push(earliest.render(earliest.match, `${keyPrefix}-i-${i++}`));
    remaining = remaining.slice(earliest.idx + earliest.match[0].length);
  }
  return out;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // HTML <img> tag (GitHub README style): <img src="https://..." alt="..." width="..." height="..." />
    const htmlImg = /^<img\b([^>]*)\/?>\s*$/i.exec(line);
    if (htmlImg) {
      const attrs = htmlImg[1];
      const src = /\bsrc="([^"]+)"/.exec(attrs)?.[1] ?? /\bsrc='([^']+)'/.exec(attrs)?.[1];
      const alt = /\balt="([^"]*)"/.exec(attrs)?.[1] ?? /\balt='([^']*)'/.exec(attrs)?.[1] ?? '';
      const width = /\bwidth="(\d+)"/.exec(attrs)?.[1] ?? /\bwidth='(\d+)'/.exec(attrs)?.[1];
      const height = /\bheight="(\d+)"/.exec(attrs)?.[1] ?? /\bheight='(\d+)'/.exec(attrs)?.[1];
      if (src && isSafeUrl(src)) {
        blocks.push(
          <figure key={key++} className="my-4">
            <img
              src={src}
              alt={alt}
              loading="lazy"
              width={width ? Number(width) : undefined}
              height={height ? Number(height) : undefined}
              className="max-w-full h-auto rounded-lg mx-auto"
              style={{ border: '1px solid var(--theme-border)' }}
            />
            {alt && (
              <figcaption className="text-xs text-center mt-2" style={{ color: 'var(--theme-text-muted)' }}>
                {alt}
              </figcaption>
            )}
          </figure>,
        );
        i++;
        continue;
      }
    }

    // Block image: ![alt](url) on its own line
    const imgBlock = /^!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)\s*$/.exec(line);
    if (imgBlock && isSafeUrl(imgBlock[2])) {
      blocks.push(
        <figure key={key++} className="my-4">
          <img
            src={imgBlock[2]}
            alt={imgBlock[1]}
            loading="lazy"
            className="max-w-full h-auto rounded-lg mx-auto"
            style={{ border: '1px solid var(--theme-border)' }}
          />
          {imgBlock[1] && (
            <figcaption
              className="text-xs text-center mt-2"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              {imgBlock[1]}
            </figcaption>
          )}
        </figure>,
      );
      i++;
      continue;
    }

    // Block video: !video[caption](url) — supports direct files and YouTube/Vimeo
    const videoBlock = /^!video\[([^\]]*)\]\((https:\/\/[^\s)]+)\)\s*$/.exec(line);
    if (videoBlock && isSafeUrl(videoBlock[2])) {
      const url = videoBlock[2];
      const caption = videoBlock[1];
      const yt = youTubeEmbed(url);
      const vm = vimeoEmbed(url);
      blocks.push(
        <figure key={key++} className="my-4">
          {yt || vm ? (
            <div
              className="relative w-full overflow-hidden rounded-lg"
              style={{ paddingTop: '56.25%', border: '1px solid var(--theme-border)' }}
            >
              <iframe
                src={yt || vm || ''}
                title={caption || 'Embedded video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 w-full h-full"
              />
            </div>
          ) : (
            <video
              src={url}
              controls
              preload="metadata"
              className="max-w-full h-auto rounded-lg mx-auto block"
              style={{ border: '1px solid var(--theme-border)' }}
            />
          )}
          {caption && (
            <figcaption
              className="text-xs text-center mt-2"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              {caption}
            </figcaption>
          )}
        </figure>,
      );
      i++;
      continue;
    }

    // Block audio: !audio[caption](url)
    const audioBlock = /^!audio\[([^\]]*)\]\((https:\/\/[^\s)]+)\)\s*$/.exec(line);
    if (audioBlock && isSafeUrl(audioBlock[2])) {
      blocks.push(
        <figure key={key++} className="my-4">
          <audio
            src={audioBlock[2]}
            controls
            preload="metadata"
            className="w-full"
          />
          {audioBlock[1] && (
            <figcaption
              className="text-xs text-center mt-2"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              {audioBlock[1]}
            </figcaption>
          )}
        </figure>,
      );
      i++;
      continue;
    }

    // Headings
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const content = renderInline(h[2], `h-${key}`);
      if (level === 1) {
        blocks.push(
          <h1 key={key++} className="text-3xl font-bold mt-6 mb-3">
            {content}
          </h1>,
        );
      } else if (level === 2) {
        blocks.push(
          <h2 key={key++} className="text-xl font-semibold mt-5 mb-2">
            {content}
          </h2>,
        );
      } else {
        blocks.push(
          <h3 key={key++} className="text-lg font-semibold mt-4 mb-2">
            {content}
          </h3>,
        );
      }
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(?:---+|\*\*\*+|___+)\s*$/.test(line)) {
      blocks.push(
        <hr key={key++} className="my-4 border-t" style={{ borderColor: 'var(--theme-border)' }} />,
      );
      i++;
      continue;
    }

    // Fenced code block
    if (/^```/.test(line)) {
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      blocks.push(
        <pre
          key={key++}
          className="p-3 rounded-lg overflow-x-auto my-3 text-sm font-mono"
          style={{ backgroundColor: 'color-mix(in srgb, var(--theme-card-bg) 80%, transparent)', border: '1px solid var(--theme-border)' }}
        >
          <code>{codeLines.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // Blockquote (incl. GitHub alert syntax: > [!NOTE] / [!TIP] / [!WARNING] / [!IMPORTANT] / [!CAUTION])
    if (/^>\s*/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s*/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s*/, ''));
        i++;
      }
      const alertMatch = /^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]$/i.exec(quoteLines[0]?.trim() ?? '');
      if (alertMatch) {
        const kind = alertMatch[1].toUpperCase() as 'NOTE' | 'TIP' | 'WARNING' | 'IMPORTANT' | 'CAUTION';
        const alertStyles: Record<string, { border: string; title: string; icon: string }> = {
          NOTE:      { border: '#3b82f6', title: '#60a5fa', icon: 'ℹ' },
          TIP:       { border: '#22c55e', title: '#4ade80', icon: '✦' },
          WARNING:   { border: '#f97316', title: '#fb923c', icon: '⚠' },
          IMPORTANT: { border: '#a855f7', title: '#c084fc', icon: '✶' },
          CAUTION:   { border: '#ef4444', title: '#f87171', icon: '✖\uFE0E' },
        };
        const { border, title, icon } = alertStyles[kind];
        const bodyLines = quoteLines.slice(1);
        blocks.push(
          <blockquote
            key={key++}
            className="border-l-4 pl-4 my-3 py-1"
            style={{ borderColor: border }}
          >
            <p className="font-semibold mb-1 text-sm flex items-center gap-1.5" style={{ color: title }}>
              <span aria-hidden="true">{icon}</span>
              {kind.charAt(0) + kind.slice(1).toLowerCase()}
            </p>
            {bodyLines.filter(l => l.trim()).map((ql, qi) => (
              <p key={qi} className="mb-1 leading-relaxed" style={{ color: 'var(--theme-text-secondary)' }}>
                {renderInline(ql, `bq-${key}-${qi}`)}
              </p>
            ))}
          </blockquote>,
        );
        continue;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="border-l-4 pl-4 my-3"
          style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
        >
          {quoteLines.map((ql, qi) => (
            <p key={qi} className="mb-1 leading-relaxed italic">
              {renderInline(ql, `bq-${key}-${qi}`)}
            </p>
          ))}
        </blockquote>,
      );
      continue;
    }

    // Bullet list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={key++} className="list-disc list-inside space-y-1 mb-3">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `li-${key}-${idx}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={key++} className="list-decimal list-inside space-y-1 mb-3">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `ol-${key}-${idx}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Paragraph (consume contiguous non-blank, non-special lines)
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^>/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^(?:---+|\*\*\*+|___+)\s*$/.test(lines[i]) &&
      !/^!\[[^\]]*\]\(https:\/\/[^\s)]+\)\s*$/.test(lines[i]) &&
      !/^!(?:video|audio)\[[^\]]*\]\(https:\/\/[^\s)]+\)\s*$/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="mb-3 leading-relaxed">
        {renderInline(para.join(' '), `p-${key}`)}
      </p>,
    );
  }

  return <div className={className}>{blocks}</div>;
}
