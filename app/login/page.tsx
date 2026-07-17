import { redirect } from "next/navigation";
import { auth, microsoftSignInEnabled } from "@/auth";
import { IsbLogo } from "@/components/isb-logo";
import { SkylineIllustration } from "@/components/skyline-illustration";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect(session.user.isAdmin ? "/admin" : "/dashboard");

  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      {/* Brand hero */}
      <div
        className="relative flex flex-col justify-between gap-10 overflow-hidden px-6 py-10 text-white sm:px-10 md:w-1/2 md:py-14"
        style={{
          background: "linear-gradient(160deg, var(--brand-navy) 0%, var(--brand-navy-deep) 100%)",
        }}
      >
        <IsbLogo variant="white" height={30} />
        <div>
          <p className="text-sm font-medium text-brand-mint">Welcome to</p>
          <h1 className="mt-2 text-4xl font-semibold leading-[1.1] sm:text-5xl">
            One Club Conclave 2026
          </h1>
          <p className="mt-4 max-w-sm text-sm text-white/70">
            The Career Advancement Council&apos;s flagship recruiting conclave — book your
            workshops, panels, and recruiter sessions in one place.
          </p>
        </div>
        <SkylineIllustration className="h-28 w-full text-white sm:h-36 md:h-44" />
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-card px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-semibold tracking-tight">Sign in to your account</h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            {microsoftSignInEnabled
              ? "Use your ISB email and PGP ID, or sign in with Microsoft."
              : "Use your ISB email and PGP ID to continue."}
          </p>
          <LoginForm urlError={error} microsoftSignInEnabled={microsoftSignInEnabled} />
        </div>
      </div>
    </div>
  );
}
