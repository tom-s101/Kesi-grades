"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { reassignClass, setGradeLevelActive, setTeacherActive } from "@/app/(app)/school/actions";
import type { GradeLevel, School, Subject, Teacher } from "@/lib/types";

type Assignment = { grade_level_id: string; subject_id: string; teacher_id: string };
type GradeActive = { grade_level_id: string; is_active: boolean };

export function SchoolAdminClient({
  schools,
  activeSchoolId,
  isMasterAdmin,
  gradeLevels,
  subjects,
  schoolYearId,
  gradeLevelActive,
  assignments,
  teachers,
}: {
  schools: School[];
  activeSchoolId: string;
  isMasterAdmin: boolean;
  gradeLevels: GradeLevel[];
  subjects: Subject[];
  schoolYearId: string;
  gradeLevelActive: GradeActive[];
  assignments: Assignment[];
  teachers: Teacher[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [activeMap, setActiveMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(gradeLevels.map((g) => [g.id, gradeLevelActive.find((a) => a.grade_level_id === g.id)?.is_active ?? true])),
  );
  const [assignMap, setAssignMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      assignments.map((a) => [`${a.grade_level_id}:${a.subject_id}`, a.teacher_id]),
    ),
  );

  function toggleGrade(gradeLevelId: string) {
    const next = !activeMap[gradeLevelId];
    setActiveMap((m) => ({ ...m, [gradeLevelId]: next }));
    startTransition(async () => {
      await setGradeLevelActive({ schoolId: activeSchoolId, gradeLevelId, schoolYearId, isActive: next });
    });
  }

  function changeTeacher(gradeLevelId: string, subjectId: string, teacherId: string) {
    setAssignMap((m) => ({ ...m, [`${gradeLevelId}:${subjectId}`]: teacherId }));
    startTransition(async () => {
      await reassignClass({ schoolId: activeSchoolId, gradeLevelId, subjectId, schoolYearId, teacherId });
    });
  }

  function toggleTeacherActive(teacherId: string, active: boolean) {
    startTransition(async () => {
      await setTeacherActive(teacherId, active);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {isMasterAdmin && (
        <Card className="p-4">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-soft">School</label>
          <Select
            defaultValue={activeSchoolId}
            onChange={(e) => router.push(`/school?school=${e.target.value}`)}
            className="max-w-xs"
          >
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Grade levels offered this year</CardTitle>
          <CardDescription>Turn a grade off if nobody&rsquo;s enrolled — it disappears from entry screens instead of showing empty.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {gradeLevels.map((g) => (
            <button
              key={g.id}
              onClick={() => toggleGrade(g.id)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                activeMap[g.id]
                  ? "border-brand bg-brand-soft text-brand-strong"
                  : "border-border-strong bg-surface-sunken text-text-faint"
              }`}
            >
              {g.name}
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Class assignments</CardTitle>
          <CardDescription>
            Reassign a subject to a different teacher, or give the same teacher two grade levels to merge classes.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-faint">
                <th className="py-2 pr-4 font-medium">Grade</th>
                <th className="py-2 pr-4 font-medium">Subject</th>
                <th className="py-2 font-medium">Teacher</th>
              </tr>
            </thead>
            <tbody>
              {gradeLevels
                .filter((g) => activeMap[g.id])
                .flatMap((g) =>
                  subjects.map((subj) => (
                    <tr key={`${g.id}:${subj.id}`} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4 text-text-soft">{g.name}</td>
                      <td className="py-2 pr-4 text-text-soft">{subj.name}</td>
                      <td className="py-2">
                        <Select
                          className="max-w-[220px]"
                          value={assignMap[`${g.id}:${subj.id}`] ?? ""}
                          onChange={(e) => changeTeacher(g.id, subj.id, e.target.value)}
                        >
                          <option value="" disabled>
                            Unassigned
                          </option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.full_name}
                            </option>
                          ))}
                        </Select>
                      </td>
                    </tr>
                  )),
                )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teachers at this school</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {teachers.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-text">{t.full_name}</span>
                {t.is_head_teacher && <Badge tone="brand">Head Teacher</Badge>}
                {!t.active && <Badge tone="neutral">Inactive</Badge>}
              </div>
              <button
                onClick={() => toggleTeacherActive(t.id, !t.active)}
                className="text-xs font-medium text-brand hover:underline"
              >
                {t.active ? "Deactivate" : "Reactivate"}
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
