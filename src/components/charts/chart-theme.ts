/**
 * Chart pop-ups in the app's own colours. Recharts sets no text colour
 * of its own, so on the dark theme the subject and its number came out
 * dark-on-dark and vanished.
 */
export const chartTooltip = {
  cursor: { fill: "var(--surface-sunken)" },
  contentStyle: {
    background: "var(--surface-raised)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--text)",
    boxShadow: "var(--elevation-2)",
  },
  labelStyle: { color: "var(--text)", fontWeight: 600, marginBottom: 2 },
  itemStyle: { color: "var(--text)" },
} as const;
