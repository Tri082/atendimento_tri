import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/onboarding");

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <span className="label-mono">/ login</span>
        <h1 className="font-semibold text-3xl tracking-tight">Bem-vindo de volta</h1>
        <p className="text-muted-foreground text-sm">Entre com seu email e senha pra continuar.</p>
      </div>
      <LoginForm />
    </div>
  );
}
