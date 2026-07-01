import { ResetForm } from "./reset-form";

export const metadata = { title: "Recuperar senha" };

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="font-semibold text-2xl">Recuperar senha</h1>
        <p className="text-muted-foreground text-sm">Te enviamos um link no email.</p>
      </div>
      <ResetForm />
    </div>
  );
}
