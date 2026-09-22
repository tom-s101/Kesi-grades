"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  addSection,
  createTeacher,
  reassignClass,
  renameSection,
  renameTeacher,
  setGradeLevelActive,
  setTeacherActive,
} from "@/app/(app)/school/actions";
import type { ClassSection, GradeLevel, School, Subject, Teacher } from "@/lib/types";

type Assignment = { id: string; grade_level_id: string; section_id: string; subject_id: string; teacher_id: string };
type GradeActive = { grade_level_id: string; is_active: boolean };

export function SchoolAdminClient({
  schools,
  activeSchoolId,
  isMasterAdmin,
  gradeLevels,
  subjects,
  schoolYearId,
  gradeLevelActive,
  sections,
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
  sections: ClassSection[];
  assignments: Assignment[];
  teachers: Teacher[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [activeMap, setActiveMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(gradeLevels.map((g) => [g.id, gradeLevelActive.find((a) => a.grade_level_id === g.id)?.is_active ?? true])),
  );
  const [sectionList, setSectionList] = useState<ClassSection[]>(sections);
  const [assignMap, setAssignMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(assignments.map((a) => [`${a.section_id}:${a.subject_id}`, a.teacher_id])),
  );
  const [newSectionDrafts, setNewSectionDrafts] = useState<Record<string, string>>({});

  function toggleGrade(gradeLevelId: string) {
    const next = !activeMap[gradeLevelId];
    setActiveMap((m) => ({ ...m, [gradeLevelId]: next }));
    startTransition(async () => {
      await setGradeLevelActive({ schoolId: activeSchoolId, gradeLevelId, schoolYearId, isActive: next });
    });
  }

  function changeTeacher(sectionId: string, subjectId: string, teacherId: string) {
    const section = sectionList.find((s) => s.id === sectionId);
    if (!section) return;
    setAssignMap((m) => ({ ...m, [`${sectionId}:${subjectId}`]: teacherId }));
    startTransition(async () => {
      await reassignClass({
        schoolId: activeSchoolId,
        gradeLevelId: section.grade_level_id,
        sectionId,
        subjectId,
        schoolYearId,
        teacherId,
      });
    });
  }

  async function handleAddSection(gradeLevelId: string) {
    const name = (newSectionDrafts[gradeLevelId] ?? "").trim();
    if (!name) return;
    const existingForGrade = sectionList.filter((s) => s.grade_level_id === gradeLevelId);
    const result = await addSection({
      schoolId: activeSchoolId,
      gradeLevelId,
      schoolYearId,
      name,
      sortOrder: existingForGrade.length + 1,
    });
    if (result.section) {
      setSectionList((list) => [...list, result.section as ClassSection]);
      setNewSectionDrafts((d) => ({ ...d, [gradeLevelId]: "" }));
    }
  }

  function handleRenameSection(sectionId: string, name: string) {
    setSectionList((list) => list.map((s) => (s.id === sectionId ? { ...s, name } : s)));
    startTransition(async () => {
      await renameSection(sectionId, name);
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
          <CardTitle>Classes &amp; teachers</CardTitle>
          <CardDescription>
            Add a second class under a grade to split it between two teachers — each only sees their own class&rsquo;s
            students.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {gradeLevels
            .filter((g) => activeMap[g.id])
            .map((g) => {
              const gradeSections = sectionList
                .filter((s) => s.grade_level_id === g.id)
                .sort((a, b) => a.sort_order - b.sort_order);
              return (
                <div key={g.id} className="space-y-3">
                  <p className="font-display text-base font-medium text-text">{g.name}</p>
                  <div className="space-y-3">
                    {gradeSections.map((section) => (
                      <div key={section.id} className="rounded-lg border border-border p-3">
                        <input
                          defaultValue={section.name}
                          onBlur={(e) => {
                            if (e.target.value.trim() && e.target.value !== section.name) {
                              handleRenameSection(section.id, e.target.value.trim());
                            }
                          }}
                          className="mb-2 rounded-md border border-transparent bg-transparent px-1 text-sm font-semibold text-text hover:border-border-strong focus-visible:border-border-strong focus-visible:outline-none"
                        />
                        {/* Subject above the picker on phones — side by
                            side there leaves the picker too narrow to
                            read a teacher's full name. */}
                        <ul className="divide-y divide-border text-sm">
                          {subjects.map((subj) => (
                            <li
                              key={subj.id}
                              className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                            >
                              <span className="text-text-soft">{subj.name}</span>
                              <Select
                                aria-label={`Teacher for ${subj.name}`}
                                className="h-10 w-full sm:h-9 sm:max-w-[220px]"
                                value={assignMap[`${section.id}:${subj.id}`] ?? ""}
                                onChange={(e) => changeTeacher(section.id, subj.id, e.target.value)}
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
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="New class name, e.g. Section B"
                      value={newSectionDrafts[g.id] ?? ""}
                      onChange={(e) => setNewSectionDrafts((d) => ({ ...d, [g.id]: e.target.value }))}
                      className="max-w-[220px]"
                    />
                    <Button type="button" variant="secondary" size="sm" onClick={() => handleAddSection(g.id)}>
                      <Plus size={14} /> Add another class
                    </Button>
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teachers at this school</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddTeacherForm schoolId={activeSchoolId} isMasterAdmin={isMasterAdmin} />
          <div className="space-y-2">
            {teachers.map((t) => (
              <TeacherRow key={t.id} teacher={t} onToggleActive={toggleTeacherActive} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TeacherRow({
  teacher,
  onToggleActive,
}: {
  teacher: Teacher;
  onToggleActive: (id: string, active: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(teacher.full_name);
  const [pending, startTransition] = useTransition();

  function save() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === teacher.full_name) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      await renameTeacher(teacher.id, trimmed);
      setEditing(false);
    });
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <div className="flex items-center gap-2">
        {editing ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="h-8 max-w-[220px]"
            disabled={pending}
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 font-medium text-text hover:text-brand"
          >
            {teacher.full_name}
            <Pencil size={12} className="text-text-faint" />
          </button>
        )}
        {teacher.is_head_teacher && <Badge tone="brand">Head Teacher</Badge>}
        {!teacher.active && <Badge tone="neutral">Inactive</Badge>}
      </div>
      <button
        onClick={() => onToggleActive(teacher.id, !teacher.active)}
        className="text-xs font-medium text-brand hover:underline"
      >
        {teacher.active ? "Deactivate" : "Reactivate"}
      </button>
    </div>
  );
}

function AddTeacherForm({ schoolId, isMasterAdmin }: { schoolId: string; isMasterAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createTeacher({}, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <UserPlus size={15} /> Add teacher
      </Button>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-3 rounded-lg border border-border-strong bg-surface-sunken p-4">
      <input type="hidden" name="school_id" value={schoolId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" required />
        </div>
        <div>
          <Label htmlFor="email">Email (their login)</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div>
          <Label htmlFor="password">Temporary password</Label>
          <Input id="password" name="password" type="text" minLength={8} required placeholder="At least 8 characters" />
        </div>
        {isMasterAdmin && (
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-text">
              <input type="checkbox" name="is_head_teacher" className="h-4 w-4 rounded border-border-strong" />
              Head teacher for this school
            </label>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-status-bad">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add teacher"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      <p className="text-xs text-text-faint">Tell them the temporary password — they can change it after logging in.</p>
    </form>
  );
}
