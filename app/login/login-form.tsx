"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginWithRoster, loginWithMicrosoft, type LoginFormState } from "./actions";

export function LoginForm({ urlError }: { urlError?: string }) {
  const [state, formAction, pending] = useActionState<LoginFormState, FormData>(
    loginWithRoster,
    undefined
  );

  const errorMessage =
    state?.error ??
    (urlError === "NotRegistered"
      ? "That Microsoft account's email isn't on the CAC participant roster. Contact CAC if you believe this is a mistake."
      : urlError === "NoEmailFromMicrosoft"
        ? "We couldn't read an email address from your Microsoft account. Please try again or use the ISB email + PGP ID login."
        : urlError
          ? "Sign-in failed. Please try again."
          : undefined);

  return (
    <div className="flex flex-col gap-6">
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

        {errorMessage && (
          <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
            {errorMessage}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Checking…" : "Log in"}
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        or
        <div className="h-px flex-1 bg-border" />
      </div>

      <form action={loginWithMicrosoft}>
        <Button type="submit" variant="outline" className="w-full">
          Sign in with Microsoft
        </Button>
      </form>
    </div>
  );
}
