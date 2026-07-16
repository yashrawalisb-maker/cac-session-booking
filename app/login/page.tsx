import { redirect } from "next/navigation";
import { auth, microsoftSignInEnabled } from "@/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">CAC Session Booking</CardTitle>
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
  );
}
