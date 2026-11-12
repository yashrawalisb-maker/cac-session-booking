"use server";

import { AuthError } from "next-auth";
import { signIn, testPgidLoginEnabled } from "@/auth";

const GENERIC_ROSTER_ERROR =
  "We couldn't find your details. Please check your ISB email and PGP ID, or contact CAC.";

export type LoginFormState = { error?: string } | undefined;

export async function loginWithRoster(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const isbEmail = String(formData.get("isbEmail") ?? "").trim();
  const pgpId = String(formData.get("pgpId") ?? "").trim();

  if (!isbEmail || !pgpId) {
    return { error: "Please enter both your ISB email and PGP ID." };
  }

  try {
    await signIn("roster", { isbEmail, pgpId, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: GENERIC_ROSTER_ERROR };
    }
    throw error; // rethrow the internal redirect signal on success
  }
}

/** Test-only: sign in with just a PGP ID. Refuses unless TEST_PGID_LOGIN is on (never in production). */
export async function loginWithPgid(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  if (!testPgidLoginEnabled) return { error: "PGP ID sign-in isn't available here." };

  const pgpId = String(formData.get("pgpId") ?? "").trim();
  if (!pgpId) return { error: "Please enter your PGP ID." };

  try {
    await signIn("pgid", { pgpId, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "We couldn't find that PGP ID on the roster. Please check it and try again." };
    }
    throw error; // rethrow the internal redirect signal on success
  }
}

export async function loginWithMicrosoft() {
  await signIn("microsoft-entra-id", { redirectTo: "/" });
}
