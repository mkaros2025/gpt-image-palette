import { useState } from 'react';

import { NAV_ITEMS, normalizePageId, type PageId } from './lib/navigation';
import './styles.css';

export function App() {
  const [page, setPage] = useState<PageId>(() => {
    if (typeof window === 'undefined') {
      return 'generate';
    }
    return normalizePageId(window.location.hash.replace('#/', ''));
  });

  const selectPage = (next: PageId) => {
    if (typeof window !== 'undefined') {
      window.location.hash = `/${next}`;
    }
    setPage(next);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand-button" type="button" onClick={() => selectPage('generate')}>
          PaperPalette
        </button>
        <nav className="topnav" aria-label="主导航">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={item.id === page ? 'nav-link nav-link--active' : 'nav-link'}
              type="button"
              onClick={() => selectPage(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>
      <section className="page-frame">
        <p className="empty-state">页面待实现</p>
      </section>
    </main>
  );
}
