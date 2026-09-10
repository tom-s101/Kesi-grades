"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createStudent, updateStudent, type StudentFormState } from "@/app/(app)/students/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import type { GradeLevel, School, Student } from "@/lib/types";

const initialState: StudentFormState = {};

export function StudentForm({
  mode,
  student,
  gradeLevels,
  schools,
  defaultSchoolId,
}: {
  mode: "create" | "edit";
  student?: Student;
  gradeLevels: GradeLevel[];
  schools: School[];
  defaultSchoolId?: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(mode === "create" ? createStudent : updateStudent, initialState);

  useEffect(() => {
    if (state.ok) router.push(mode === "create" ? "/students" : `/students/${student?.id}`);
  }, [state.ok, router, mode, student?.id]);

  return (
    <form action={action} className="space-y-5">
      {student && <input type="hidden" name="id" value={student.id} />}

      {schools.length > 0 && (
        <div>
          <Label htmlFor="school_id">School</Label>
          <Select id="school_id" name="school_id" defaultValue={student?.school_id ?? defaultSchoolId ?? ""} required>
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
      {schools.length === 0 && defaultSchoolId && <input type="hidden" name="school_id" value={defaultSchoolId} />}

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
          <Label htmlFor="grade_level_id">Grade level</Label>
          <Select id="grade_level_id" name="grade_level_id" defaultValue={student?.current_grade_level_id ?? ""}>
            <option value="">Unassigned</option>
            {gradeLevels.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </div>
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
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue={student?.status ?? "active"}>
              <option value="active">Active</option>
              <option value="dropped">Dropped</option>
              <option value="transferred">Transferred</option>
              <option value="completed">Completed</option>
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="guardian_name">Parent / guardian name</Label>
          <Input id="guardian_name" name="guardian_name" defaultValue={student?.guardian_name ?? ""} />
        </div>
        <div>
          <Label htmlFor="guardian_contact">Guardian contact</Label>
          <Input id="guardian_contact" name="guardian_contact" defaultValue={student?.guardian_contact ?? ""} />
        </div>
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
