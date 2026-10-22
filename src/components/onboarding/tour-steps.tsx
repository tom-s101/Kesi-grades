import {
  BarChart3,
  Building2,
  CalendarCheck,
  CalendarRange,
  CheckCircle2,
  DatabaseBackup,
  FileDown,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  NotebookPen,
  PartyPopper,
  Save,
  Sprout,
  TriangleAlert,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export type TourStep = {
  id: string;
  /** The page this step is on; the tour goes there first. */
  route?: string;
  /** `data-tour` marker to point at. No target: a centred card. */
  target?: string;
  /**
   * What to point at on a phone or tablet instead, where the menu sits
   * behind ☰ — so steps about the menu point at that button.
   */
  compactTarget?: string;
  icon: LucideIcon;
  title: string;
  body: string;
  /** Different wording on a phone, where the menu is behind ☰. */
  compactBody?: string;
};

export type TourAudience = { firstName: string; isHeadTeacher: boolean; isAdmin: boolean };

/**
 * The welcome tour, in the order a teacher meets things: their
 * dashboard, their students, entering grades, taking attendance, report
 * cards, then their account. Head teachers and admins get their extra
 * pages before the account step.
 */
export function buildTourSteps({ firstName, isHeadTeacher, isAdmin }: TourAudience): TourStep[] {
  const menu = (page: string) => `Tap the menu (☰) at the top of the screen, then ${page}.`;

  const steps: TourStep[] = [
    {
      id: "welcome",
      icon: Sprout,
      title: `Welcome to KESI, ${firstName}`,
      body: "Here's a quick look at where everything lives — your students, grades and attendance. It takes about a minute. You can skip it now and replay it any time from the menu.",
    },
    {
      id: "dashboard-stats",
      route: "/dashboard",
      target: "dashboard-stats",
      icon: LayoutDashboard,
      title: "Your class at a glance",
      body: "Every time you sign in you land here. These tiles show how many students you have, how many are passing (80 and up), who has attendance warnings, and which scores are still missing this week.",
    },
    {
      id: "dashboard-chart",
      route: "/dashboard",
      target: "dashboard-chart",
      icon: BarChart3,
      title: "Subject averages",
      body: "Each bar is a subject's average for the latest quarter that has exam scores. Bars below the 80 passing mark turn red, so you can see at once where students need help.",
    },
    {
      id: "dashboard-watch",
      route: "/dashboard",
      target: "dashboard-watch",
      icon: TriangleAlert,
      title: "Attendance watch list",
      body: "Students with 2 or more effective absences appear here. Tap a name to open that student's record.",
    },
    {
      id: "nav-students",
      route: "/dashboard",
      target: "nav-/students",
      compactTarget: "menu-button",
      icon: Users,
      title: "Students",
      body: "Your class lists are under Students in the menu.",
      compactBody: menu("Students"),
    },
    {
      id: "students-list",
      route: "/students",
      target: "students-list",
      icon: UserRound,
      title: "Find any student",
      body: "Search by name or filter by grade. Tap a student to see their grades, attendance and family details — and to fix a typo in their name.",
    },
    {
      id: "nav-grades",
      route: "/students",
      target: "nav-/grades",
      compactTarget: "menu-button",
      icon: NotebookPen,
      title: "Grades",
      body: "Scores are entered under Grades.",
      compactBody: menu("Grades"),
    },
    {
      id: "grades-pickers",
      route: "/grades",
      target: "grades-pickers",
      icon: NotebookPen,
      title: "Pick what you're grading",
      body: "Choose the class, the subject and the quarter. Everything below changes to match.",
    },
    {
      id: "grades-tabs",
      route: "/grades",
      target: "grades-tabs",
      icon: ListChecks,
      title: "Quizzes, homework, exam",
      body: "Quizzes are entered week by week — use the arrows to change week; a week with no quiz can simply be left empty. Homework & Participation is one score for the whole quarter. The Quarterly Exam is one score per quarter too.",
    },
    {
      id: "grades-sheet",
      route: "/grades",
      target: "grades-sheet",
      icon: NotebookPen,
      title: "Type the scores",
      body: "Enter each student's score as a percentage, or switch to Raw score and set what it's out of. A box turns red if a score is too high.",
    },
    {
      id: "grades-save",
      route: "/grades",
      target: "grades-save",
      icon: Save,
      title: "Saved as you type",
      body: "Scores save themselves a moment after you stop typing, and before you change week or class. Watch for “Saved” here. If the signal drops, it keeps trying until it gets through.",
    },
    {
      id: "nav-attendance",
      route: "/grades",
      target: "nav-/attendance",
      compactTarget: "menu-button",
      icon: CalendarCheck,
      title: "Attendance",
      body: "Daily attendance is under Attendance.",
      compactBody: menu("Attendance"),
    },
    {
      id: "attendance-controls",
      route: "/attendance",
      target: "attendance-controls",
      icon: CalendarRange,
      title: "Today, or a whole week",
      body: "Pick your class and the date. Switch to Week to see five days at once — handy for catching up on days you missed, or a whole quarter with one button.",
    },
    {
      id: "attendance-mark-all",
      route: "/attendance",
      target: "attendance-mark-all",
      icon: CheckCircle2,
      title: "Everyone present? One tap",
      body: "Mark the whole class present, then change only the students who were late or absent. Fridays have a morning session only.",
    },
    {
      id: "attendance-save",
      route: "/attendance",
      target: "attendance-save",
      icon: Save,
      title: "Save attendance",
      body: "Tap Save attendance when you're done. Absences add up automatically, and students with too many show on your dashboard.",
    },
    {
      id: "nav-reports",
      route: "/attendance",
      target: "nav-/reports",
      compactTarget: "menu-button",
      icon: FileDown,
      title: "Reports",
      body: "Report cards are under Reports.",
      compactBody: menu("Reports"),
    },
    {
      id: "reports-cards",
      route: "/reports",
      target: "reports-cards",
      icon: FileDown,
      title: "Report cards",
      body: "Pick a student to open a printable report card, with their grades worked out from the scores you entered. Print it, or save it as a PDF.",
    },
  ];

  if (isHeadTeacher || isAdmin) {
    steps.push(
      {
        id: "nav-school",
        route: "/reports",
        target: "nav-/school",
        compactTarget: "menu-button",
        icon: Building2,
        title: "School Admin",
        body: "Running a school? Classes and teachers are set up under School Admin.",
        compactBody: menu("School Admin"),
      },
      {
        id: "school-admin",
        route: "/school",
        target: "school-admin",
        icon: Building2,
        title: "Classes and teachers",
        body: "Turn grades on or off, split a grade into two classes, choose who teaches what, and add a new teacher's login.",
      },
    );
  }

  if (isAdmin) {
    steps.push(
      {
        id: "admin-backup",
        route: "/admin",
        target: "admin-backup",
        icon: DatabaseBackup,
        title: "Organization and backups",
        body: "Every campus side by side. Download a backup to Excel now and then and keep it somewhere safe.",
      },
      {
        id: "nav-logins",
        route: "/admin",
        target: "nav-/admin/logins",
        compactTarget: "menu-button",
        icon: KeyRound,
        title: "Teacher logins",
        body: "See who is still on the starting password and when each teacher last signed in, and reset a forgotten password.",
        compactBody: menu("Teacher logins"),
      },
    );
  }

  steps.push(
    {
      id: "account",
      target: "account",
      compactTarget: "menu-button",
      icon: KeyRound,
      title: "Your account",
      body: "Change your password or sign out here. “Take the tour” plays this walkthrough again whenever you like.",
      compactBody: "Your account is at the bottom of the menu (☰): change your password, sign out, or take this tour again.",
    },
    {
      id: "done",
      route: "/dashboard",
      icon: PartyPopper,
      title: "You're all set",
      body: "That's everything you need to get started. If you get stuck, the tour is always in the menu under “Take the tour”.",
    },
  );

  return steps;
}
