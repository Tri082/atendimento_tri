import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { SignUpForm } from "./signup-form";

export const metadata = { title: "Criar conta" };

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect("/onboarding");

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <span className="label-mono">/ signup</span>
        <h1 className="font-semibold text-3xl tracking-tight">Bora começar</h1>
        <p className="text-muted-foreground text-sm">
          Crie sua conta — em segundos você tá dentro.
        </p>
      </div>
      <SignUpForm />
    </div>
  );
}
