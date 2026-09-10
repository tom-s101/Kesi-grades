/**
 * Hand-written mirror of the Supabase schema in supabase/migrations/.
 * Once the project is live, prefer regenerating this with:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/types.ts
 * and re-adding the convenience aliases at the bottom.
 */

export type AttendanceStatus = "present" | "late" | "absent";
export type AttendanceSession = "am" | "pm";
export type AssessmentType = "quiz" | "homework_participation";
export type StudentStatus = "active" | "dropped" | "transferred" | "completed";
export type Sex = "M" | "F";

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};
type ViewOnly<Row> = { Row: Row; Relationships: [] };

export interface Database {
  public: {
    Tables: {
      schools: Table<
        { id: string; name: string; slug: string; created_at: string },
        { id?: string; name: string; slug: string }
      >;
      grade_levels: Table<
        { id: string; code: string; name: string; sort_order: number },
        { id?: string; code: string; name: string; sort_order: number }
      >;
      subjects: Table<
        { id: string; code: string; name: string; sort_order: number },
        { id?: string; code: string; name: string; sort_order: number }
      >;
      school_years: Table<
        { id: string; label: string; start_date: string; end_date: string; is_current: boolean },
        { id?: string; label: string; start_date: string; end_date: string; is_current?: boolean }
      >;
      quarters: Table<
        {
          id: string;
          school_year_id: string;
          number: number;
          name: string;
          start_date: string;
          end_date: string;
          exam_week_start: string;
          exam_week_end: string;
        },
        {
          id?: string;
          school_year_id: string;
          number: number;
          name: string;
          start_date: string;
          end_date: string;
          exam_week_start: string;
          exam_week_end: string;
        }
      >;
      school_grade_levels: Table<
        { school_id: string; grade_level_id: string; school_year_id: string; is_active: boolean },
        { school_id: string; grade_level_id: string; school_year_id: string; is_active?: boolean }
      >;
      grade_weight_configs: Table<
        {
          id: string;
          school_year_id: string;
          exam_weight: number;
          quiz_weight: number;
          homework_weight: number;
        },
        {
          id?: string;
          school_year_id: string;
          exam_weight?: number;
          quiz_weight?: number;
          homework_weight?: number;
        }
      >;
      teachers: Table<
        {
          id: string;
          full_name: string;
          school_id: string | null;
          is_head_teacher: boolean;
          is_master_admin: boolean;
          whatsapp_number: string | null;
          active: boolean;
          created_at: string;
        },
        {
          id: string;
          full_name: string;
          school_id?: string | null;
          is_head_teacher?: boolean;
          is_master_admin?: boolean;
          whatsapp_number?: string | null;
          active?: boolean;
        }
      >;
      class_subject_teachers: Table<
        {
          id: string;
          school_id: string;
          grade_level_id: string;
          subject_id: string;
          school_year_id: string;
          teacher_id: string;
          created_at: string;
        },
        {
          id?: string;
          school_id: string;
          grade_level_id: string;
          subject_id: string;
          school_year_id: string;
          teacher_id: string;
        }
      >;
      students: Table<
        {
          id: string;
          school_id: string;
          lrn: string | null;
          first_name: string;
          middle_name: string | null;
          last_name: string;
          suffix: string | null;
          sex: Sex | null;
          birthdate: string | null;
          guardian_name: string | null;
          guardian_contact: string | null;
          current_grade_level_id: string | null;
          status: StudentStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          school_id: string;
          lrn?: string | null;
          first_name: string;
          middle_name?: string | null;
          last_name: string;
          suffix?: string | null;
          sex?: Sex | null;
          birthdate?: string | null;
          guardian_name?: string | null;
          guardian_contact?: string | null;
          current_grade_level_id?: string | null;
          status?: StudentStatus;
          notes?: string | null;
        }
      >;
      student_enrollments: Table<
        {
          id: string;
          student_id: string;
          school_id: string;
          grade_level_id: string;
          school_year_id: string;
          status: StudentStatus;
        },
        {
          id?: string;
          student_id: string;
          school_id: string;
          grade_level_id: string;
          school_year_id: string;
          status?: StudentStatus;
        }
      >;
      attendance_records: Table<
        {
          id: string;
          student_id: string;
          school_year_id: string;
          attendance_date: string;
          session: AttendanceSession;
          status: AttendanceStatus;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          student_id: string;
          school_year_id: string;
          attendance_date: string;
          session: AttendanceSession;
          status: AttendanceStatus;
          recorded_by?: string | null;
        }
      >;
      weekly_scores: Table<
        {
          id: string;
          student_id: string;
          school_year_id: string;
          quarter_id: string;
          subject_id: string;
          assessment_type: AssessmentType;
          week_number: number;
          raw_score: number | null;
          max_score: number | null;
          percentage: number;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          student_id: string;
          school_year_id: string;
          quarter_id: string;
          subject_id: string;
          assessment_type: AssessmentType;
          week_number: number;
          raw_score?: number | null;
          max_score?: number | null;
          percentage: number;
          recorded_by?: string | null;
        }
      >;
      quarter_exam_scores: Table<
        {
          id: string;
          student_id: string;
          school_year_id: string;
          quarter_id: string;
          subject_id: string;
          raw_score: number | null;
          max_score: number | null;
          percentage: number;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          student_id: string;
          school_year_id: string;
          quarter_id: string;
          subject_id: string;
          raw_score?: number | null;
          max_score?: number | null;
          percentage: number;
          recorded_by?: string | null;
        }
      >;
    };
    Views: {
      quarterly_grades: ViewOnly<{
        student_id: string;
        quarter_id: string;
        school_year_id: string;
        quarter_number: number;
        subject_id: string;
        subject_name: string;
        exam_percentage: number | null;
        quiz_average: number | null;
        homework_average: number | null;
        quiz_entry_count: number;
        homework_entry_count: number;
        exam_weight: number;
        quiz_weight: number;
        homework_weight: number;
        quarterly_grade: number | null;
      }>;
      final_grades: ViewOnly<{
        student_id: string;
        school_year_id: string;
        subject_id: string;
        subject_name: string;
        final_grade: number | null;
        quarters_completed: number;
      }>;
      student_general_average: ViewOnly<{
        student_id: string;
        school_year_id: string;
        quarter_id: string;
        quarter_number: number;
        general_average: number | null;
        subjects_completed: number;
      }>;
      student_attendance_summary: ViewOnly<{
        student_id: string;
        school_year_id: string;
        total_lates: number;
        direct_absence_days: number;
        absences_from_lates: number;
        effective_absences: number;
        at_warning: boolean;
        should_be_dropped: boolean;
      }>;
      class_roster_size: ViewOnly<{
        school_id: string;
        grade_level_id: string;
        student_count: number;
      }>;
      weekly_entry_counts: ViewOnly<{
        teacher_id: string;
        school_id: string;
        grade_level_id: string;
        subject_id: string;
        quarter_id: string;
        week_number: number;
        assessment_type: AssessmentType;
        students_with_entries: number;
      }>;
    };
    Functions: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Views<T extends keyof Database["public"]["Views"]> = Database["public"]["Views"][T]["Row"];

export type School = Tables<"schools">;
export type GradeLevel = Tables<"grade_levels">;
export type Subject = Tables<"subjects">;
export type Teacher = Tables<"teachers">;
export type Student = Tables<"students">;
export type Quarter = Tables<"quarters">;
export type AttendanceRecord = Tables<"attendance_records">;
export type WeeklyScore = Tables<"weekly_scores">;
export type QuarterExamScore = Tables<"quarter_exam_scores">;
export type QuarterlyGrade = Views<"quarterly_grades">;
export type AttendanceSummary = Views<"student_attendance_summary">;

export const SCHOOLS = ["Agbalite", "Binuangan", "Pinagbayanan", "Sulong Ipil", "Baraas"] as const;
