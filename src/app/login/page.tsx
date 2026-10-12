"use client";

import { useActionState } from "react";
import { GraduationCap } from "lucide-react";
import { login } from "@/app/actions/auth";
import { Card } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <form action={action} className="space-y-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight">Class Tracker</h1>
          </div>

          <Field label="Email" htmlFor="email">
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={`w-full ${inputClass}`}
            />
          </Field>

          <Field label="Password" htmlFor="password">
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className={`w-full ${inputClass}`}
            />
          </Field>

          {state?.error && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
