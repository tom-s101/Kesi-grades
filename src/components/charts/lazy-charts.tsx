"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/loader";

/**
 * The charting library is by far the heaviest thing the app ships —
 * bigger than the rest of the client bundle put together. Loading it
 * separately lets the dashboard's figures paint straight away on a
 * phone, with the chart filling in a moment later.
 */

function ChartSkeleton() {
  return (
    <div className="flex h-72 w-full items-end gap-2 px-2 pb-6" aria-hidden>
      {[55, 80, 42, 68, 90, 60, 74, 50].map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

export const SubjectAverageChart = dynamic(
  () => import("@/components/dashboard/subject-average-chart").then((m) => m.SubjectAverageChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export const SchoolPassingRateChart = dynamic(
  () => import("@/components/admin/school-passing-rate-chart").then((m) => m.SchoolPassingRateChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
