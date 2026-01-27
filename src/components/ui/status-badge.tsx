import { cn } from "@/lib/utils";

type StatusType = "draft" | "published" | "archived";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  draft: {
    label: "Borrador",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  published: {
    label: "Publicado",
    className: "bg-success/10 text-success border-success/20",
  },
  archived: {
    label: "Archivado",
    className: "bg-muted text-muted-foreground border-muted-foreground/20",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
