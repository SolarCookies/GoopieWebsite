import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Newspaper, Plus, Pencil, Trash2, X, Save, Tag, ExternalLink, Heart, Gamepad2, ChevronLeft, ChevronRight, ImagePlus } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Sidebar, SIDEBAR_WIDTH_CLASS } from '../components/Sidebar';
import { Footer } from '../components/Footer';
import { Markdown } from '../components/Markdown';
import { useNews, type NewsPost, type NewsPostExtras } from '../data/useNews';
import { useGameStore } from '../data/GameStore';
import { useAuth } from '../auth/AuthContext';

function formatDate(ms: number): string {
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function tagsFromString(s: string): string[] {
  return s
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

interface EditorState {
  title: string;
  thumbnails: string[];
  tagsInput: string;
  recompId: string;
  patreonUrl: string;
  body: string;
  /** datetime-local string ('' = use creation time / no override) */
  publishedAtInput: string;
}

function emptyEditorState(): EditorState {
  return {
    title: '',
    thumbnails: [''],
    tagsInput: '',
    recompId: '',
    patreonUrl: '',
    body: '',
    publishedAtInput: '',
  };
}

function msToLocalInput(ms: number | undefined): string {
  if (!ms) return '';
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToMs(value: string): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function fromPost(p: NewsPost): EditorState {
  const list = (p.thumbnails && p.thumbnails.length > 0)
    ? [...p.thumbnails]
    : (p.thumbnail ? [p.thumbnail] : ['']);
  return {
    title: p.title,
    thumbnails: list.length > 0 ? list : [''],
    tagsInput: (p.tags || []).join(', '),
    recompId: p.recompId || '',
    patreonUrl: p.patreonUrl || '',
    body: p.body,
    publishedAtInput: msToLocalInput(p.publishedAt),
  };
}

export function News() {
  const [searchQuery, setSearchQuery] = useState('');
  const { posts, loaded, canPost, canEdit, canSchedule, createPost, updatePost, deletePost } = useNews();
  const { games, getGame } = useGameStore();
  const { user } = useAuth();

  const [openPost, setOpenPost] = useState<NewsPost | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<NewsPost | null>(null);
  const [form, setForm] = useState<EditorState>(emptyEditorState);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restrict the recomp dropdown to games the current user can author for.
  const recompOptions = useMemo(() => {
    if (!user) return [] as typeof games;
    if (user.role === 'admin') return games;
    return games.filter((g) => (user.assignedGames || []).includes(g.id));
  }, [games, user]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) => {
      if (p.title.toLowerCase().includes(q)) return true;
      if (p.body.toLowerCase().includes(q)) return true;
      if (p.authorName.toLowerCase().includes(q)) return true;
      if ((p.tags || []).some((t) => t.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [posts, searchQuery]);

  // Lock background scroll when an overlay is open.
  useEffect(() => {
    const anyOpen = editorOpen || !!openPost;
    if (!anyOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [editorOpen, openPost]);

  // Close overlays on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (editorOpen) setEditorOpen(false);
      else if (openPost) setOpenPost(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editorOpen, openPost]);

  // If the open post is updated/deleted in Firestore, sync or close the overlay.
  useEffect(() => {
    if (!openPost) return;
    const fresh = posts.find((p) => p.id === openPost.id);
    if (!fresh) {
      setOpenPost(null);
    } else if (fresh !== openPost) {
      setOpenPost(fresh);
    }
  }, [posts, openPost]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyEditorState());
    setError(null);
    setEditorOpen(true);
  };

  const openEdit = (post: NewsPost) => {
    setEditing(post);
    setForm(fromPost(post));
    setError(null);
    setEditorOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const cleanedThumbs = form.thumbnails.map((t) => t.trim()).filter(Boolean);
    const extras: NewsPostExtras = {
      thumbnails: cleanedThumbs,
      tags: tagsFromString(form.tagsInput),
      recompId: form.recompId,
      patreonUrl: form.patreonUrl,
    };
    if (canSchedule) {
      const ms = localInputToMs(form.publishedAtInput);
      extras.publishedAt = ms === null ? null : ms;
    }
    const result = editing
      ? await updatePost(editing.id, form.title, form.body, extras)
      : await createPost(form.title, form.body, extras);
    setSaving(false);
    if (result === 'ok') {
      setEditorOpen(false);
    } else {
      setError(result);
    }
  };

  const handleDelete = async (post: NewsPost) => {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    const result = await deletePost(post.id);
    if (result === 'ok') {
      setOpenPost((p) => (p?.id === post.id ? null : p));
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col ${SIDEBAR_WIDTH_CLASS}`}
      style={{ backgroundColor: 'var(--theme-page-bg)', color: 'var(--theme-text-primary)' }}
    >
      <Sidebar />
      <TopBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <section className="px-4 md:px-10 py-8 md:py-12 flex-1">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-3">
              <Newspaper className="w-8 h-8" style={{ color: 'var(--theme-text-primary)' }} />
              <h2 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--theme-text-primary)' }}>
                News
              </h2>
            </div>
            {canPost && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
                style={{
                  background: 'linear-gradient(to bottom right, var(--theme-gradient-from), var(--theme-gradient-to))',
                  color: 'var(--theme-text-primary)',
                }}
              >
                <Plus className="w-4 h-4" />
                New post
              </button>
            )}
          </div>
          <p className="text-sm md:text-base mb-8" style={{ color: 'var(--theme-text-secondary)' }}>
            Announcements and dev updates from the Goopie team and recomp authors.
          </p>

          {!loaded ? (
            <div
              className="rounded-lg p-8 text-center"
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                border: '1px solid var(--theme-border)',
                color: 'var(--theme-text-muted)',
              }}
            >
              Loading news…
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="rounded-lg p-8 text-center"
              style={{
                backgroundColor: 'var(--theme-card-bg)',
                border: '1px solid var(--theme-border)',
                color: 'var(--theme-text-muted)',
              }}
            >
              {posts.length === 0
                ? 'No articles yet. Check back soon for dev updates.'
                : 'No posts match your search.'}
            </div>
          ) : (
            <NewsGrid posts={filtered} onOpen={setOpenPost} />
          )}
        </div>
      </section>

      {openPost && (
        <NewsOverlay
          post={openPost}
          relatedGame={openPost.recompId ? getGame(openPost.recompId) : undefined}
          canEdit={canEdit(openPost)}
          onClose={() => setOpenPost(null)}
          onEdit={() => openEdit(openPost)}
          onDelete={() => handleDelete(openPost)}
        />
      )}

      {editorOpen && (
        <NewsEditorOverlay
          isEdit={!!editing}
          form={form}
          setForm={setForm}
          recompOptions={recompOptions}
          canSchedule={canSchedule}
          saving={saving}
          error={error}
          onClose={() => setEditorOpen(false)}
          onSave={handleSave}
        />
      )}

      <Footer />
    </div>
  );
}

/* ---------------- Grid ---------------- */

function NewsGrid({ posts, onOpen }: { posts: NewsPost[]; onOpen: (p: NewsPost) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
      {posts.map((post) => (
        <NewsCard key={post.id} post={post} onOpen={() => onOpen(post)} />
      ))}
    </div>
  );
}

function NewsCard({ post, onOpen }: { post: NewsPost; onOpen: () => void }) {
  const tags = post.tags || [];
  const cover = post.thumbnails?.[0] || post.thumbnail || '';
  const extraImages = (post.thumbnails?.length || 0) - 1;
  const displayDate = post.publishedAt ?? post.createdAt;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left flex flex-col rounded-lg overflow-hidden transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2"
      style={{
        backgroundColor: 'var(--theme-card-bg)',
        border: '1px solid var(--theme-border)',
        color: 'var(--theme-text-primary)',
      }}
    >
      <div
        className="w-full aspect-[3/4] relative overflow-hidden"
        style={{ backgroundColor: 'var(--theme-page-bg)' }}
      >
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background:
                'linear-gradient(to bottom right, var(--theme-gradient-from), var(--theme-gradient-to))',
              opacity: 0.6,
            }}
          >
            <Newspaper className="w-10 h-10" style={{ color: 'var(--theme-text-primary)' }} />
          </div>
        )}
        {extraImages > 0 && (
          <span
            className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}
          >
            +{extraImages}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 p-2">
        <h3
          className="text-sm font-semibold leading-tight line-clamp-2"
          style={{ color: 'var(--theme-text-primary)' }}
          title={post.title}
        >
          {post.title}
        </h3>
        <div className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
          {post.authorName} · {formatDate(displayDate)}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{
                  backgroundColor: 'var(--theme-item-selected)',
                  color: 'var(--theme-text-primary)',
                  border: '1px solid var(--theme-border)',
                }}
              >
                {t}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-[10px]" style={{ color: 'var(--theme-text-muted)' }}>
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

/* ---------------- Read overlay ---------------- */

function NewsOverlay({
  post,
  relatedGame,
  canEdit,
  onClose,
  onEdit,
  onDelete,
}: {
  post: NewsPost;
  relatedGame: ReturnType<ReturnType<typeof useGameStore>['getGame']> | undefined;
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tags = post.tags || [];
  const images = (post.thumbnails && post.thumbnails.length > 0)
    ? post.thumbnails
    : (post.thumbnail ? [post.thumbnail] : []);
  const [imgIdx, setImgIdx] = useState(0);
  useEffect(() => { setImgIdx(0); }, [post.id]);
  const displayDate = post.publishedAt ?? post.createdAt;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-start md:items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={post.title}
    >
      <div
        className="w-full max-w-3xl my-4 rounded-lg overflow-hidden shadow-2xl relative"
        style={{
          backgroundColor: 'var(--theme-card-bg)',
          border: '1px solid var(--theme-border)',
          color: 'var(--theme-text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full hover:opacity-90"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff' }}
        >
          <X className="w-5 h-5" />
        </button>

        {images.length > 0 && (
          <div className="relative" style={{ borderBottom: '1px solid var(--theme-border)' }}>
            <img
              key={imgIdx}
              src={images[imgIdx]}
              alt=""
              loading="lazy"
              className="w-full max-h-80 object-cover"
            />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
                  aria-label="Previous image"
                  className="absolute top-1/2 -translate-y-1/2 left-2 p-1.5 rounded-full hover:opacity-90"
                  style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff' }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                  aria-label="Next image"
                  className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 rounded-full hover:opacity-90"
                  style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff' }}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setImgIdx(i)}
                      aria-label={`Go to image ${i + 1}`}
                      className="w-2 h-2 rounded-full transition-opacity"
                      style={{
                        backgroundColor: '#fff',
                        opacity: i === imgIdx ? 1 : 0.45,
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="p-6">
          <header className="flex items-start justify-between gap-4 mb-3 flex-wrap">
            <div className="min-w-0">
              <h2 className="text-2xl md:text-3xl font-bold mb-1" style={{ color: 'var(--theme-text-primary)' }}>
                {post.title}
              </h2>
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                {post.authorPicture && (
                  <img src={post.authorPicture} alt="" className="w-5 h-5 rounded-full object-cover" />
                )}
                <span>{post.authorName}</span>
                <span>•</span>
                <span>{formatDate(displayDate)}</span>
                {post.updatedAt && post.updatedAt > (post.publishedAt ?? post.createdAt) && (
                  <span>(edited {formatDate(post.updatedAt)})</span>
                )}
              </div>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <button
                  onClick={onEdit}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--theme-item-selected)',
                    color: 'var(--theme-text-primary)',
                    border: '1px solid var(--theme-border)',
                  }}
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={onDelete}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: 'rgba(220, 38, 38, 0.2)',
                    color: '#fca5a5',
                    border: '1px solid rgba(220, 38, 38, 0.4)',
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </header>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: 'var(--theme-item-selected)',
                    color: 'var(--theme-text-primary)',
                    border: '1px solid var(--theme-border)',
                  }}
                >
                  <Tag className="w-3 h-3" />
                  {t}
                </span>
              ))}
            </div>
          )}

          {(relatedGame || post.patreonUrl) && (
            <div className="flex flex-wrap gap-2 mb-5">
              {relatedGame && (
                <Link
                  to={`/library/${relatedGame.recompName}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                  style={{
                    background:
                      'linear-gradient(to bottom right, var(--theme-gradient-from), var(--theme-gradient-to))',
                    color: 'var(--theme-text-primary)',
                  }}
                >
                  <Gamepad2 className="w-4 h-4" />
                  {relatedGame.title}
                </Link>
              )}
              {post.patreonUrl && (
                <a
                  href={post.patreonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: '#f96854',
                    color: '#fff',
                  }}
                >
                  <Heart className="w-4 h-4" />
                  Support on Patreon
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
              )}
            </div>
          )}

          <Markdown source={post.body} className="text-sm md:text-base" />
        </div>
      </div>
    </div>
  );
}

/* ---------------- Editor overlay ---------------- */

function NewsEditorOverlay({
  isEdit,
  form,
  setForm,
  recompOptions,
  canSchedule,
  saving,
  error,
  onClose,
  onSave,
}: {
  isEdit: boolean;
  form: EditorState;
  setForm: (updater: (prev: EditorState) => EditorState) => void;
  recompOptions: ReturnType<typeof useGameStore>['games'];
  canSchedule: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const update = <K extends keyof EditorState>(key: K, value: EditorState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const updateThumbnail = (idx: number, value: string) =>
    setForm((prev) => {
      const next = [...prev.thumbnails];
      next[idx] = value;
      return { ...prev, thumbnails: next };
    });

  const addThumbnail = () =>
    setForm((prev) =>
      prev.thumbnails.length >= 8 ? prev : { ...prev, thumbnails: [...prev.thumbnails, ''] },
    );

  const removeThumbnail = (idx: number) =>
    setForm((prev) => {
      const next = prev.thumbnails.filter((_, i) => i !== idx);
      return { ...prev, thumbnails: next.length > 0 ? next : [''] };
    });

  const moveThumbnail = (idx: number, dir: -1 | 1) =>
    setForm((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.thumbnails.length) return prev;
      const next = [...prev.thumbnails];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...prev, thumbnails: next };
    });

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--theme-page-bg)',
    color: 'var(--theme-text-primary)',
    border: '1px solid var(--theme-border)',
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit news post' : 'New news post'}
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
          <h2 className="text-xl font-bold">{isEdit ? 'Edit news post' : 'New news post'}</h2>
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
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="Post title"
              className="w-full px-3 py-2 rounded text-sm"
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Header images</label>
            <div className="space-y-2">
              {form.thumbnails.map((url, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span
                    className="text-xs font-mono w-6 text-center"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    {idx + 1}
                  </span>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateThumbnail(idx, e.target.value)}
                    placeholder="https://example.com/header.png"
                    className="flex-1 px-3 py-2 rounded text-sm"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => moveThumbnail(idx, -1)}
                    disabled={idx === 0}
                    aria-label="Move up"
                    className="p-1.5 rounded hover:opacity-80 disabled:opacity-30"
                    style={{
                      backgroundColor: 'var(--theme-item-selected)',
                      color: 'var(--theme-text-primary)',
                      border: '1px solid var(--theme-border)',
                    }}
                  >
                    <ChevronLeft className="w-4 h-4 rotate-90" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveThumbnail(idx, 1)}
                    disabled={idx === form.thumbnails.length - 1}
                    aria-label="Move down"
                    className="p-1.5 rounded hover:opacity-80 disabled:opacity-30"
                    style={{
                      backgroundColor: 'var(--theme-item-selected)',
                      color: 'var(--theme-text-primary)',
                      border: '1px solid var(--theme-border)',
                    }}
                  >
                    <ChevronRight className="w-4 h-4 rotate-90" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeThumbnail(idx)}
                    aria-label="Remove image"
                    className="p-1.5 rounded hover:opacity-80"
                    style={{
                      backgroundColor: 'rgba(220, 38, 38, 0.18)',
                      color: '#fca5a5',
                      border: '1px solid rgba(220, 38, 38, 0.4)',
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {form.thumbnails.length < 8 && (
                <button
                  type="button"
                  onClick={addThumbnail}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--theme-item-selected)',
                    color: 'var(--theme-text-primary)',
                    border: '1px solid var(--theme-border)',
                  }}
                >
                  <ImagePlus className="w-4 h-4" /> Add image
                </button>
              )}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>
              Optional. https only. The first image is the grid thumbnail; the post overlay shows all images as a slideshow. Up to 8 images.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tags</label>
            <input
              type="text"
              value={form.tagsInput}
              onChange={(e) => update('tagsInput', e.target.value)}
              placeholder="release, patch notes, halo"
              className="w-full px-3 py-2 rounded text-sm"
              style={inputStyle}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>
              Optional. Comma-separated. Up to 12 tags, max 32 characters each.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Linked recomp</label>
              <select
                value={form.recompId}
                onChange={(e) => update('recompId', e.target.value)}
                className="w-full px-3 py-2 rounded text-sm"
                style={inputStyle}
              >
                <option value="">— None —</option>
                {recompOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
              <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>
                Optional. Adds a button on the post that links to the game page.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Patreon link</label>
              <input
                type="url"
                value={form.patreonUrl}
                onChange={(e) => update('patreonUrl', e.target.value)}
                placeholder="https://www.patreon.com/yourpage"
                className="w-full px-3 py-2 rounded text-sm"
                style={inputStyle}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>
                Optional. Must be a patreon.com URL.
              </p>
            </div>
          </div>

          {canSchedule && (
            <div>
              <label className="block text-sm font-medium mb-1">Publication date</label>
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={form.publishedAtInput}
                  onChange={(e) => update('publishedAtInput', e.target.value)}
                  className="flex-1 px-3 py-2 rounded text-sm"
                  style={inputStyle}
                />
                {form.publishedAtInput && (
                  <button
                    type="button"
                    onClick={() => update('publishedAtInput', '')}
                    className="px-2.5 py-1.5 rounded text-xs font-medium hover:opacity-80"
                    style={{
                      backgroundColor: 'var(--theme-item-selected)',
                      color: 'var(--theme-text-primary)',
                      border: '1px solid var(--theme-border)',
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>
                Admin only. Overrides the displayed date and the order in which posts appear. Leave empty to use the original creation time.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Body</label>
            <textarea
              value={form.body}
              onChange={(e) => update('body', e.target.value)}
              placeholder={'## Heading\n\nMarkdown body — supports **bold**, *italic*, `code`, [links](https://example.com).\n\n![alt text](https://example.com/image.png)\n\n!video[caption](https://youtu.be/VIDEO_ID)'}
              rows={12}
              className="w-full px-3 py-2 rounded text-sm font-mono resize-y"
              style={inputStyle}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>
              Markdown: # / ## / ### headings, - bullets, **bold**, *italic*, `code`, [links](url). Media (each on its own line, https only): ![alt](image-url), !video[caption](url-or-YouTube/Vimeo), !audio[caption](url).
            </p>
          </div>
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
            onClick={onSave}
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
