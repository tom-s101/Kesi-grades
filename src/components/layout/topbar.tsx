import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { roleLabel } from "@/lib/auth";
import type { CurrentTeacher } from "@/lib/auth";

export function Topbar({ teacher, title }: { teacher: CurrentTeacher; title?: string }) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-5 py-4 lg:px-8">
      <div>
        {title && <h1 className="font-display text-xl font-medium text-text">{title}</h1>}
        {!title && (
          <p className="text-sm text-text-soft">
            {teacher.school_name ?? "All campuses"}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Badge tone="brand">{roleLabel(teacher)}</Badge>
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-text">{teacher.full_name}</p>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
