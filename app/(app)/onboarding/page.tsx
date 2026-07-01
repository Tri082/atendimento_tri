import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { getUserOrgs } from "@/lib/orgs/queries";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Novo workspace" };

type Props = { searchParams: Promise<{ new?: string }> };

export default async function OnboardingPage({ searchParams }: Props) {
  const user = await requireUser();
  const { new: isNew } = await searchParams;
  const orgs = await getUserOrgs(user.id);

  // Se já tem org E não pediu explicitamente "novo" via query param,
  // mande pro dashboard da primeira org. Sem isso, user logado em outro
  // tab vai pra /onboarding e fica preso.
  if (orgs.length > 0 && isNew !== "1") {
    redirect(`/app/${orgs[0]!.organization.slug}/dashboard`);
  }

  const isFirst = orgs.length === 0;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="font-semibold text-2xl">{isFirst ? "Bem-vindo!" : "Novo workspace"}</h1>
          <p className="text-muted-foreground text-sm">
            {isFirst
              ? "Vamos criar seu primeiro workspace."
              : "Crie outro workspace separado do que você já tem."}
          </p>
        </div>
        <OnboardingForm />
      </div>
    </div>
  );
}
