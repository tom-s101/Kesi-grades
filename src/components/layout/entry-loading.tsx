import { PageLoader } from "@/components/ui/loader";

/** Shared fallback for the two data-entry screens. */
export function EntryLoading({ title }: { title: string }) {
  return <PageLoader label={`Loading ${title.toLowerCase()}`} />;
}
