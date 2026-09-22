"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Search } from "lucide-react";
import { Select } from "@/components/ui/input";
import type { StudentListRow } from "@/lib/queries";

type Option = { id: string; name: string };

/** Same roster, filtered in the browser — no round trip to narrow a list. */
export function ReportCardPicker({
  students,
  gradeLevels,
  schools,
  showSchool,
}: {
  students: StudentListRow[];
  gradeLevels: Option[];
  schools: Option[];
  showSchool: boolean;
}) {
  const [q, setQ] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [gradeLevelId, setGradeLevelId] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return students.filter(
      (s) =>
        (!schoolId || s.schoolId === schoolId) &&
        (!gradeLevelId || s.gradeLevelId === gradeLevelId) &&
        (!needle || s.name.toLowerCase().includes(needle)),
    );
  }, [students, q, schoolId, gradeLevelId]);

  return (
    <div>
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name…"
            aria-label="Search students by name"
            className="h-11 w-full rounded-lg border border-border-strong bg-surface-raised pl-9 pr-3 text-base text-text placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-10 sm:text-sm"
          />
        </div>
        <div className="flex gap-2">
          {showSchool && schools.length > 0 && (
            <Select
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              aria-label="Filter by school"
              className="h-11 flex-1 text-base sm:h-10 sm:w-48 sm:flex-none sm:text-sm"
            >
              <option value="">All schools</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
          <Select
            value={gradeLevelId}
            onChange={(e) => setGradeLevelId(e.target.value)}
            aria-label="Filter by grade level"
            className="h-11 flex-1 text-base sm:h-10 sm:w-44 sm:flex-none sm:text-sm"
          >
            <option value="">All grades</option>
            {gradeLevels.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="divide-y divide-border">
        {filtered.map((s) => (
          <Link
            key={s.id}
            href={`/reports/report-card/${s.id}`}
            className="flex items-center justify-between gap-3 py-3 active:bg-surface-sunken sm:py-2.5"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-text">{s.name}</span>
              <span className="block truncate text-xs text-text-faint">
                {s.gradeName}
                {showSchool ? ` · ${s.schoolName}` : ""}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-brand">
              <FileText size={14} />
              <span className="hidden sm:inline">View report card</span>
            </span>
          </Link>
        ))}
        {filtered.length === 0 && <p className="py-8 text-center text-text-faint">No students found.</p>}
      </div>
    </div>
  );
}
