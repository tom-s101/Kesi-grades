import { differenceInYears } from "date-fns";

export function fullName(s: { first_name: string; middle_name?: string | null; last_name: string; suffix?: string | null }) {
  const middle = s.middle_name ? ` ${s.middle_name[0]}.` : "";
  const suffix = s.suffix ? ` ${s.suffix}` : "";
  return `${s.first_name}${middle} ${s.last_name}${suffix}`;
}

export function ageFromBirthdate(birthdate: string | null): number | null {
  if (!birthdate) return null;
  return differenceInYears(new Date(), new Date(birthdate));
}

export function initials(s: { first_name: string; last_name: string }) {
  return `${s.first_name[0] ?? ""}${s.last_name[0] ?? ""}`.toUpperCase();
}
