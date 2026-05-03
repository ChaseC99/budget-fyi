import { useState } from "react";
import { SearchOverlay } from "./SearchOverlay";
import styles from "./SiteHeader.module.css";

interface SiteHeaderProps {
  currentPath?: string;
}

export function SiteHeader({ currentPath = "/" }: SiteHeaderProps) {
  const isAboutPage = currentPath === "/about";
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a className={styles.brand} href="/" aria-label="budget.fyi home">
          budget.fyi
        </a>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.iconButton}
            data-search-trigger=""
            aria-label={isSearchOpen ? "Close search" : "Search budget items"}
            aria-expanded={isSearchOpen}
            aria-controls="search-results"
            onClick={() => setIsSearchOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M16.5 16.5L21 21" />
            </svg>
          </button>

          <a
            className={styles.iconButton}
            href="/about"
            aria-label="About budget.fyi"
            aria-current={isAboutPage ? "page" : undefined}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 10.25v5.25" />
              <circle cx="12" cy="7.25" r="1" className={styles.infoDot} />
            </svg>
          </a>
        </div>
      </div>

      <SearchOverlay
        open={isSearchOpen}
        currentPath={currentPath}
        onClose={() => setIsSearchOpen(false)}
      />
    </header>
  );
}
