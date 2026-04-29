import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { TopBar } from '../components/TopBar';
import { Sidebar, SIDEBAR_WIDTH_CLASS } from '../components/Sidebar';
import { Footer } from '../components/Footer';

export function Downloads() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isInCEF, setIsInCEF] = useState(false);
  const [launcherExists, setLauncherExists] = useState(false);

  useEffect(() => {
    setIsInCEF(typeof (window as any).GetPlatform === 'function');
  }, []);

  useEffect(() => {
    fetch('/GoopieLauncher.msi', { method: 'HEAD' })
      .then(res => {
        const ct = res.headers.get('Content-Type') ?? '';
        setLauncherExists(res.ok && !ct.includes('text/html'));
      })
      .catch(() => setLauncherExists(false));
  }, []);

  return (
    <div
      className={`min-h-screen flex flex-col ${SIDEBAR_WIDTH_CLASS}`}
      style={{ backgroundColor: 'var(--theme-page-bg)', color: 'var(--theme-text-primary)' }}
    >
      <Sidebar />
      <TopBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isInCEF={isInCEF}
      />

      <section className="flex-1 px-4 md:px-10 py-12 md:py-16">
        <div className="max-w-3xl mx-auto">
          <h1
            className="text-3xl md:text-4xl font-bold mb-2"
            style={{ color: 'var(--theme-text-primary)' }}
          >
            Downloads
          </h1>
          <p
            className="text-sm md:text-base mb-10"
            style={{ color: 'var(--theme-text-secondary)' }}
          >
            Get the Goopie Launcher for your platform.
          </p>

          {/* Windows */}
          <div
            className="rounded-xl p-6 md:p-8 mb-6 border"
            style={{
              backgroundColor: 'var(--theme-card-bg)',
              borderColor: 'var(--theme-border)',
            }}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2
                  className="text-xl md:text-2xl font-bold mb-1"
                  style={{ color: 'var(--theme-text-primary)' }}
                >
                  Windows x64
                </h2>
                <p
                  className="text-sm"
                  style={{ color: 'var(--theme-text-secondary)' }}
                >
                  Recommended for Windows 10 / 11. MSI installer.
                </p>
              </div>
              {launcherExists ? (
                <a
                  href="/GoopieLauncher.msi"
                  download
                  className="flex items-center gap-2 px-5 h-11 rounded-lg text-sm font-semibold shrink-0 transition-opacity hover:opacity-90"
                  style={{
                    background: `linear-gradient(to bottom right, var(--theme-gradient-from), var(--theme-gradient-to))`,
                    color: 'var(--theme-text-primary)',
                  }}
                >
                  <Download className="w-4 h-4" />
                  Download for Windows
                </a>
              ) : (
                <span
                  className="flex items-center gap-2 px-5 h-11 rounded-lg text-sm font-semibold shrink-0 opacity-60 cursor-not-allowed"
                  style={{
                    backgroundColor: 'var(--theme-item-selected)',
                    color: 'var(--theme-text-primary)',
                  }}
                >
                  <Download className="w-4 h-4" />
                  Currently Unavailable
                </span>
              )}
            </div>
          </div>

          {/* Linux / macOS */}
          <div
            className="rounded-xl p-6 md:p-8 border"
            style={{
              backgroundColor: 'var(--theme-card-bg)',
              borderColor: 'var(--theme-border)',
            }}
          >
            <h2
              className="text-xl md:text-2xl font-bold mb-1"
              style={{ color: 'var(--theme-text-primary)' }}
            >
              Linux &amp; macOS
            </h2>
            <p
              className="text-sm"
              style={{ color: 'var(--theme-text-secondary)' }}
            >
              Coming soon.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
