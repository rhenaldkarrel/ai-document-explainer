export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-1 rounded-full bg-primary" aria-hidden />
      <h2 className="font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase">
        {children}
      </h2>
    </div>
  );
}
