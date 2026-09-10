import { MANAGERS, type Manager } from "./pool";

/**
 * Managers are painted from validated categorical slots 1–4, referenced as CSS
 * custom properties so the light/dark steps swap in one place (see globals.css).
 * Colour follows the person, never their rank — a manager keeps their hue whether
 * they are winning or last.
 */
export const MANAGER_VAR: Record<Manager, string> = {
  Tom: "var(--s1)",
  Jeff: "var(--s2)",
  Colin: "var(--s3)",
  Joey: "var(--s4)",
};

export const managerColor = (m: Manager) => MANAGER_VAR[m] ?? "var(--ink-3)";
export const ORDERED_MANAGERS = MANAGERS;
