import Link from "next/link";
import { Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/** Shown instead of a 404 when a student reaches an event that exists but isn't published yet. */
export function LaunchingSoon() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <Rocket className="size-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Will be live at 8:00PM</h1>
        <p className="text-sm text-muted-foreground">Stay tuned!</p>
        <Button render={<Link href="/dashboard" />} className="mt-2">
          Back to dashboard
        </Button>
      </CardContent>
    </Card>
  );
}
