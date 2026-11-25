"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithRoster, loginWithMicrosoft, loginWithPgid, loginWithStaff, type LoginFormState } from "./actions";

export function LoginForm({
  subtitle,
  urlError,
  microsoftSignInEnabled,
  testPgidLogin = false,
}: {
  subtitle: string;
  urlError?: string;
  microsoftSignInEnabled: boolean;
  testPgidLogin?: boolean;
}) {
  const [staff, setStaff] = useState(false);
  return (
    <div className="flex flex-col gap-6">
      <p className="mt-1 text-sm text-muted-foreground">
        {staff ? "CAC staff: enter your staff ID and password." : subtitle}
      </p>
      {staff ? (
        <StaffLoginForm />
      ) : testPgidLogin ? (
        <PgidLoginForm />
      ) : (
        <StandardLoginForm urlError={urlError} microsoftSignInEnabled={microsoftSignInEnabled} />
      )}
      <button
        type="button"
        onClick={() => setStaff((v) => !v)}
        className="self-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        {staff ? "Student? Go back to the student sign-in" : "CAC staff? Sign in with your staff ID"}
      </button>
    </div>
  );
}

/** CAC staff accounts (not students): staff ID + password. */
function StaffLoginForm() {
  const [state, formAction, pending] = useActionState<LoginFormState, FormData>(loginWithStaff, undefined);
  // Controlled so the ID survives a wrong password (React resets uncontrolled fields after the action).
  const [staffId, setStaffId] = useState("");
  return (
    <div className="flex flex-col gap-4">
      {state?.error && (
        <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="staffId">Staff ID</Label>
          <Input
            id="staffId"
            name="staffId"
            type="text"
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            autoComplete="username"
            autoCapitalize="characters"
            placeholder="e.g. STAFF01"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <Button type="submit" disabled={pending} className="h-11 w-full text-base">
          {pending ? "Checking…" : "Sign in as staff"}
        </Button>
      </form>
    </div>
  );
}

/** Test builds only (TEST_PGID_LOGIN): one PGP ID field, no Microsoft. */
function PgidLoginForm() {
  const [state, formAction, pending] = useActionState<LoginFormState, FormData>(loginWithPgid, undefined);
  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-md bg-warning-bg px-3 py-2 text-sm text-warning">
        Test version — uses a test copy of the data. Sign in with just your PGP ID.
      </p>
      {state?.error && (
        <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pgpId">PGP ID</Label>
          <Input id="pgpId" name="pgpId" type="text" inputMode="numeric" autoComplete="off" placeholder="e.g. 62610001" required />
        </div>
        <Button type="submit" disabled={pending} className="h-11 w-full text-base">
          {pending ? "Checking…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}

function StandardLoginForm({
  urlError,
  microsoftSignInEnabled,
}: {
  urlError?: string;
  microsoftSignInEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState<LoginFormState, FormData>(
    loginWithRoster,
    undefined
  );

  const errorMessage =
    state?.error ??
    (urlError === "NotRegistered"
      ? "That Microsoft account's email isn't on the CAC participant roster. Contact CAC if you believe this is a mistake."
      : urlError === "NoEmailFromMicrosoft"
        ? "We couldn't read an email address from your Microsoft account. Please try again."
        : urlError
          ? "Sign-in failed. Please try again."
          : undefined);

  const error = errorMessage && (
    <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
      {errorMessage}
    </p>
  );

  // Break-glass only: if Microsoft SSO isn't configured, fall back to the roster form so admins
  // aren't locked out. In normal operation (SSO configured) this path never renders.
  if (!microsoftSignInEnabled) {
    return (
      <div className="flex flex-col gap-4">
        {error}
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="isbEmail">ISB Email</Label>
            <Input
              id="isbEmail"
              name="isbEmail"
              type="email"
              autoComplete="email"
              placeholder="yourname@isb.edu"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pgpId">PGP ID</Label>
            <Input id="pgpId" name="pgpId" type="text" placeholder="PGP2027001" required />
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Checking…" : "Log in"}
          </Button>
        </form>
      </div>
    );
  }

  // Microsoft SSO is the only sign-in method.
  return (
    <div className="flex flex-col gap-5">
      <form action={loginWithMicrosoft}>
        <Button type="submit" className="h-11 w-full text-base">
          Sign in with Microsoft SSO
        </Button>
      </form>
      {error}
    </div>
  );
}
