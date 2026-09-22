"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import type { GradeLevel, School, Subject } from "@/lib/types";

export function AdminFilters({
  schools,
  gradeLevels,
  subjects,
}: {
  schools: School[];
  gradeLevels: GradeLevel[];
  subjects: Subject[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  // These totals are computed across every student, so narrowing them
  // genuinely needs the server. Showing that it's working beats a
  // control that looks broken for a second or two.
  const [loading, startNavigation] = useTransition();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startNavigation(() => router.push(`/admin?${next.toString()}`));
  }

  const fields: { key: string; label: string; all: string; options: { id: string; name: string }[] }[] = [
    { key: "school", label: "School", all: "All schools", options: schools },
    { key: "grade", label: "Grade", all: "All grades", options: gradeLevels },
    { key: "subject", label: "Subject", all: "All subjects", options: subjects },
  ];

  return (
    <Card className="p-3 sm:p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label
              htmlFor={`filter-${f.key}`}
              className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-soft"
            >
              {f.label}
            </label>
            <Select
              id={`filter-${f.key}`}
              value={params.get(f.key) ?? ""}
              disabled={loading}
              onChange={(e) => update(f.key, e.target.value)}
              className="h-11 text-base sm:h-10 sm:text-sm"
            >
              <option value="">{f.all}</option>
              {f.options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </div>
        ))}
      </div>
      {loading && <p className="mt-2 text-xs text-text-faint">Updating…</p>}
    </Card>
  );
}
