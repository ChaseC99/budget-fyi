import styles from "./SiteHeader.module.css";
interface SiteHeaderProps {
  currentPath?: string;
}

export function SiteHeader({ currentPath = "/" }: SiteHeaderProps) {
  const isAboutPage = currentPath === "/about";

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a className={styles.brand} href="/" aria-label="budget.fyi home">
          budget.fyi
        </a>

        <a
          className={styles.infoLink}
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
    </header>
  );
}
