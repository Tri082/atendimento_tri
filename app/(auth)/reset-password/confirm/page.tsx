import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { verifyRecoveryCookie } from "@/lib/auth/recovery-cookie";
import { UpdateForm } from "./update-form";

export const metadata = { title: "Definir nova senha" };

/**
 * NEW-HIGH-7 + R3-AUTH-001: só permite update se sessão veio do flow de recovery.
 * Cookie `recovery_flow` agora é HMAC-signed bound ao user.id — impossível
 * forjar sem service_role.
 */
export default async function ConfirmResetPage() {
  const user = await requireUser();
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get("recovery_flow")?.value;
  if (!verifyRecoveryCookie(cookieValue, user.id)) {
    redirect("/login?error=invalid_recovery_link");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="font-semibold text-2xl">Defina sua nova senha</h1>
      </div>
      <UpdateForm />
    </div>
  );
}
