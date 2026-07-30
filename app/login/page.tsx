import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, microsoftSignInEnabled } from "@/auth";
import { IsbLogo } from "@/components/isb-logo";
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
      {/* Brand hero — solid navy matches the campus illustration's background (#192790 ≈ brand navy) */}
      <div
        className="relative flex flex-col justify-between overflow-hidden text-white md:w-1/2"
        style={{ background: "var(--brand-navy)" }}
      >
        <div className="flex flex-col gap-10 px-6 py-10 sm:px-10 md:py-14">
          <IsbLogo variant="white" height={30} />
          <div>
            <p className="text-sm font-medium text-brand-mint">Welcome to</p>
            <h1 className="mt-2 text-4xl font-semibold leading-[1.1] sm:text-5xl">
              One Club Conclave 2026
            </h1>
            <p className="mt-4 max-w-sm text-sm text-white/70">
              The Biggest Professional Networking Event of ISB
            </p>
          </div>
        </div>
        <Image
          src="/campus.png"
          alt="Illustration of the ISB campus"
          width={655}
          height={323}
          priority
          className="pointer-events-none w-full select-none"
        />
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center bg-card px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-semibold tracking-tight">Sign in to your account</h2>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            {microsoftSignInEnabled
              ? "Sign in with your institutional @isb.edu account."
              : "Use your ISB email and PGP ID to continue."}
          </p>
          <LoginForm urlError={error} microsoftSignInEnabled={microsoftSignInEnabled} />
        </div>
      </div>
    </div>
  );
}
