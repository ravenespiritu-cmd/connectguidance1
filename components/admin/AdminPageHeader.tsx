import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description: string;
  children?: React.ReactNode;
  className?: string;
};

export function AdminPageHeader({ title, description, children, className }: Props) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-4 border-b border-border/50 pb-8 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="flex gap-4">
        <div
          className="hidden h-14 w-1 shrink-0 rounded-full bg-gradient-to-b from-blue-500 to-violet-500 opacity-90 sm:block"
          aria-hidden
        />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">{description}</p>
        </div>
      </div>
      {children ? <div className="shrink-0 sm:pb-0.5">{children}</div> : null}
    </div>
  );
}
