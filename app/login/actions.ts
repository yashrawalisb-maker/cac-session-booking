"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

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

export async function loginWithMicrosoft() {
  await signIn("microsoft-entra-id", { redirectTo: "/" });
}
