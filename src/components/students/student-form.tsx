"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Lock } from "lucide-react";
import { createStudent, updateStudent, type StudentFormState } from "@/app/(app)/students/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import type { ClassSection, GradeLevel, School, Student } from "@/lib/types";

const initialState: StudentFormState = {};

export function StudentForm({
  mode,
  student,
  gradeLevels,
  sections,
  schools,
  defaultSchoolId,
  canEditSensitive = true,
}: {
  mode: "create" | "edit";
  student?: Student;
  gradeLevels: GradeLevel[];
  /** Every section for this school/year, across all grades — filtered client-side by the chosen grade. */
  sections: ClassSection[];
  schools: School[];
  defaultSchoolId?: string;
  /** Grade level / section / school / enrollment status — head teacher & master admin only. */
  canEditSensitive?: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(mode === "create" ? createStudent : updateStudent, initialState);
  const [gradeLevelId, setGradeLevelId] = useState(student?.current_grade_level_id ?? "");
  const [schoolId, setSchoolId] = useState(student?.school_id ?? defaultSchoolId ?? "");
  const [sectionId, setSectionId] = useState(student?.section_id ?? "");

  useEffect(() => {
    if (state.ok) router.push(mode === "create" ? "/students" : `/students/${student?.id}`);
  }, [state.ok, router, mode, student?.id]);

  const currentGradeName = gradeLevels.find((g) => g.id === student?.current_grade_level_id)?.name ?? "Unassigned";
  const currentSectionName = sections.find((s) => s.id === student?.section_id)?.name ?? "—";
  const sectionsForGrade = sections.filter(
    (s) => s.grade_level_id === gradeLevelId && (!schoolId || s.school_id === schoolId),
  );
  // Changing the grade or the school can strip the chosen class out of
  // the list. Fall back to "unassigned" rather than leaving a stale id
  // in the form — the database then puts the student in that grade's
  // default class.
  const selectedSection = sectionsForGrade.some((s) => s.id === sectionId) ? sectionId : "";

  return (
    <form action={action} className="space-y-5">
      {student && <input type="hidden" name="id" value={student.id} />}

      {canEditSensitive && schools.length > 0 && (
        <div>
          <Label htmlFor="school_id">School</Label>
          <Select
            id="school_id"
            name="school_id"
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            required
          >
            <option value="" disabled>
              Choose a school
            </option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      {(!canEditSensitive || schools.length === 0) && defaultSchoolId && (
        <input type="hidden" name="school_id" value={defaultSchoolId} />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="first_name">First name</Label>
          <Input id="first_name" name="first_name" defaultValue={student?.first_name} required />
        </div>
        <div>
          <Label htmlFor="middle_name">Middle name</Label>
          <Input id="middle_name" name="middle_name" defaultValue={student?.middle_name ?? ""} />
        </div>
        <div>
          <Label htmlFor="last_name">Last name</Label>
          <Input id="last_name" name="last_name" defaultValue={student?.last_name} required />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="grade_level_id" className="flex items-center gap-1">
            Grade level {!canEditSensitive && <Lock size={11} className="text-text-faint" />}
          </Label>
          {canEditSensitive ? (
            <Select
              id="grade_level_id"
              name="grade_level_id"
              value={gradeLevelId}
              onChange={(e) => setGradeLevelId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {gradeLevels.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          ) : (
            <>
              <input type="hidden" name="grade_level_id" value={student?.current_grade_level_id ?? ""} />
              <p className="flex h-10 items-center text-sm text-text-soft">{currentGradeName}</p>
            </>
          )}
        </div>
        <div>
          <Label htmlFor="section_id" className="flex items-center gap-1">
            Class / section {!canEditSensitive && <Lock size={11} className="text-text-faint" />}
          </Label>
          {canEditSensitive ? (
            <Select
              id="section_id"
              name="section_id"
              value={selectedSection}
              onChange={(e) => setSectionId(e.target.value)}
              disabled={!gradeLevelId}
            >
              <option value="">
                {gradeLevelId ? "Choose a class" : "Pick a grade first"}
              </option>
              {sectionsForGrade.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          ) : (
            <>
              <input type="hidden" name="section_id" value={student?.section_id ?? ""} />
              <p className="flex h-10 items-center text-sm text-text-soft">{currentSectionName}</p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="sex">Sex</Label>
          <Select id="sex" name="sex" defaultValue={student?.sex ?? ""}>
            <option value="">—</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="birthdate">Birthdate</Label>
          <Input id="birthdate" name="birthdate" type="date" defaultValue={student?.birthdate ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="lrn">LRN (optional)</Label>
          <Input id="lrn" name="lrn" defaultValue={student?.lrn ?? ""} placeholder="DepEd Learner Reference Number" />
        </div>
        {mode === "edit" && (
          <div>
            <Label htmlFor="status" className="flex items-center gap-1">
              Status {!canEditSensitive && <Lock size={11} className="text-text-faint" />}
            </Label>
            {canEditSensitive ? (
              <Select id="status" name="status" defaultValue={student?.status ?? "active"}>
                <option value="active">Active</option>
                <option value="dropped">Dropped</option>
                <option value="transferred">Transferred</option>
                <option value="completed">Completed</option>
              </Select>
            ) : (
              <>
                <input type="hidden" name="status" value={student?.status ?? "active"} />
                <p className="flex h-10 items-center text-sm capitalize text-text-soft">{student?.status ?? "active"}</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="father_name">Father&rsquo;s name</Label>
          <Input id="father_name" name="father_name" defaultValue={student?.father_name ?? ""} />
        </div>
        <div>
          <Label htmlFor="mother_name">Mother&rsquo;s maiden name</Label>
          <Input id="mother_name" name="mother_name" defaultValue={student?.mother_name ?? ""} />
        </div>
        <div>
          <Label htmlFor="guardian_name">Parent / guardian name (if different)</Label>
          <Input id="guardian_name" name="guardian_name" defaultValue={student?.guardian_name ?? ""} />
        </div>
        <div>
          <Label htmlFor="guardian_contact">Guardian contact</Label>
          <Input id="guardian_contact" name="guardian_contact" defaultValue={student?.guardian_contact ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="mother_tongue">Mother tongue</Label>
          <Input id="mother_tongue" name="mother_tongue" defaultValue={student?.mother_tongue ?? ""} />
        </div>
        <div>
          <Label htmlFor="ip_group">IP / ethnic group</Label>
          <Input id="ip_group" name="ip_group" defaultValue={student?.ip_group ?? ""} />
        </div>
        <div>
          <Label htmlFor="religion">Religion</Label>
          <Input id="religion" name="religion" defaultValue={student?.religion ?? ""} />
        </div>
      </div>

      <div>
        <Label htmlFor="home_address">Home address</Label>
        <Input id="home_address" name="home_address" defaultValue={student?.home_address ?? ""} />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={3} defaultValue={student?.notes ?? ""} />
      </div>

      {state.error && <p className="text-sm text-status-bad">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : mode === "create" ? "Add student" : "Save changes"}
      </Button>
    </form>
  );
}
