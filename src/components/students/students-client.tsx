"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, TriangleAlert, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import type { StudentListRow } from "@/lib/queries";

type Option = { id: string; name: string };

/**
 * The whole roster arrives once; search, school and grade narrow it
 * here in the browser. Nothing on this screen needs another request,
 * so changing a filter is instant instead of a page load.
 */
export function StudentsClient({
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

  // Only offer grades that someone in this roster is actually in —
  // picking "Grade 4" and getting an empty screen is a dead end.
  const gradesInUse = useMemo(() => {
    const present = new Set(students.map((s) => s.gradeLevelId).filter(Boolean));
    return gradeLevels.filter((g) => present.has(g.id));
  }, [students, gradeLevels]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return students.filter(
      (s) =>
        (!schoolId || s.schoolId === schoolId) &&
        (!gradeLevelId || s.gradeLevelId === gradeLevelId) &&
        (!needle || s.name.toLowerCase().includes(needle)),
    );
  }, [students, q, schoolId, gradeLevelId]);

  const filtering = Boolean(q || schoolId || gradeLevelId);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name…"
            aria-label="Search students by name"
            className="h-11 w-full rounded-lg border border-border-strong bg-surface-raised pl-9 pr-9 text-base text-text placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-10 sm:text-sm"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-text-faint hover:bg-surface-sunken hover:text-text"
            >
              <X size={15} />
            </button>
          )}
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
            {gradesInUse.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </div>

        <p className="text-xs text-text-faint">
          {filtered.length} of {students.length} student{students.length === 1 ? "" : "s"}
          {filtering && (
            <button
              onClick={() => {
                setQ("");
                setSchoolId("");
                setGradeLevelId("");
              }}
              className="ml-2 text-brand hover:underline"
            >
              Clear filters
            </button>
          )}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-raised px-4 py-10 text-center text-sm text-text-faint">
          {students.length === 0 ? "No students on this roster yet." : "No students match these filters."}
        </div>
      ) : (
        <>
          {/* Phones: a tap target per student, no sideways scrolling. */}
          <ul className="space-y-2 sm:hidden">
            {filtered.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/students/${s.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface-raised p-3 active:bg-surface-sunken"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-strong">
                    {s.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-text">{s.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-text-soft">
                      {s.gradeName}
                      {s.sectionName && s.sectionName !== "Main" ? ` · ${s.sectionName}` : ""}
                      {showSchool ? ` · ${s.schoolName}` : ""}
                    </span>
                  </span>
                  {s.atWarning && (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-status-warn">
                      <TriangleAlert size={13} />
                      {s.absences}
                    </span>
                  )}
                  {s.status !== "active" && (
                    <Badge tone="neutral" className="shrink-0 capitalize">
                      {s.status}
                    </Badge>
                  )}
                  <ChevronRight size={16} className="shrink-0 text-text-faint" />
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-xl border border-border bg-surface-raised sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-sunken text-left text-xs uppercase tracking-wide text-text-faint">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Grade</th>
                  {showSchool && <th className="px-4 py-3 font-medium">School</th>}
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-surface-sunken/60">
                    <td className="px-4 py-3">
                      <Link href={`/students/${s.id}`} className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-strong">
                          {s.initials}
                        </span>
                        <span className="font-medium text-text">{s.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-soft">
                      {s.gradeName}
                      {s.sectionName && s.sectionName !== "Main" ? ` (${s.sectionName})` : ""}
                    </td>
                    {showSchool && <td className="px-4 py-3 text-text-soft">{s.schoolName}</td>}
                    <td className="px-4 py-3">
                      <Badge tone={s.status === "active" ? "good" : "neutral"} className="capitalize">
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {s.atWarning ? (
                        <span className="inline-flex items-center gap-1 text-status-warn">
                          <TriangleAlert size={14} />
                          {s.absences} absences
                          {s.shouldBeDropped && (
                            <Badge tone="bad" className="ml-1">
                              Drop threshold
                            </Badge>
                          )}
                        </span>
                      ) : (
                        <span className="text-text-faint">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
