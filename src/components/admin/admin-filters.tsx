"use client";

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

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/admin?${next.toString()}`);
  }

  return (
    <Card className="flex flex-wrap gap-3 p-4">
      <div className="w-52">
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-soft">School</label>
        <Select defaultValue={params.get("school") ?? ""} onChange={(e) => update("school", e.target.value)}>
          <option value="">All schools</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-44">
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-soft">Grade</label>
        <Select defaultValue={params.get("grade") ?? ""} onChange={(e) => update("grade", e.target.value)}>
          <option value="">All grades</option>
          {gradeLevels.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-48">
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-soft">Subject</label>
        <Select defaultValue={params.get("subject") ?? ""} onChange={(e) => update("subject", e.target.value)}>
          <option value="">All subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>
    </Card>
  );
}
