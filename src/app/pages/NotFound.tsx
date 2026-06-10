import { Link } from 'react-router';
import { TopBar } from '../components/TopBar';
import { Sidebar, SIDEBAR_WIDTH_CLASS } from '../components/Sidebar';
import { Footer } from '../components/Footer';

export function NotFound() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <TopBar searchQuery="" onSearchChange={() => {}} />
      <div className="flex flex-1">
        <Sidebar />
        <main
          className={`flex flex-col flex-1 ${SIDEBAR_WIDTH_CLASS} items-center justify-center gap-6 px-8 py-24 text-center`}
        >
          <p className="text-8xl font-bold text-muted-foreground select-none">404</p>
          <h1 className="text-2xl font-semibold">Page not found</h1>
          <p className="text-muted-foreground max-w-sm">
            The page you're looking for doesn't exist or may have been moved.
          </p>
          <Link
            to="/"
            className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-80"
          >
            Go home
          </Link>
        </main>
      </div>
      <Footer />
    </div>
  );
}
