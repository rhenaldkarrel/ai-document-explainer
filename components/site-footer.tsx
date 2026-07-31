export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-1 px-4 py-6 text-center font-mono text-xs text-muted-foreground">
        <p>
          Made by{" "}
          <a
            href="https://rhenaldkarrel-dev.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline decoration-primary/50 underline-offset-4 transition-colors hover:text-primary"
          >
            Rhenald Karrel
          </a>
        </p>
      </div>
    </footer>
  );
}
