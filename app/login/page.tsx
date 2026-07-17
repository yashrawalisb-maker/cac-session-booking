import { redirect } from "next/navigation";
import { auth, microsoftSignInEnabled } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div
        className="relative flex flex-col gap-10 overflow-hidden px-6 py-10 text-white sm:px-10 md:w-1/2 md:justify-between md:py-14"
        style={{
          background:
            "linear-gradient(160deg, var(--brand-navy) 0%, var(--brand-navy-deep) 100%)",
        }}
      >
        <IsbLogo variant="white" height={30} />
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-brand-mint sm:text-sm">
            Career Advancement Council
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold leading-[1.1] sm:text-5xl">
            Where Growth Is
          </h1>
          <p className="mt-4 max-w-sm text-sm text-white/70">
            Book your seat at CAC events — workshops, panels, and recruiter sessions, all in one
            place.
          </p>
        </div>
        <SkylineIllustration className="h-32 w-full text-white sm:h-40 md:h-48" />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>
              {microsoftSignInEnabled
                ? "Log in with your ISB email and PGP ID, or sign in with Microsoft."
                : "Log in with your ISB email and PGP ID."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm urlError={error} microsoftSignInEnabled={microsoftSignInEnabled} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
