import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgRole } from "@/lib/auth/guards";
import { DeleteOrgForm } from "./delete-org-form";
import { LogoUploader } from "./logo-uploader";
import { OrganizationForm } from "./organization-form";

type Props = { params: Promise<{ orgSlug: string }> };

export const metadata = { title: "Configurações do workspace" };

export default async function OrganizationSettingsPage({ params }: Props) {
  const { orgSlug } = await params;
  const { org, role } = await requireOrgRole({ orgSlug, roles: ["owner", "admin"] });
  const isOwner = role === "owner";

  return (
    <div className="max-w-2xl space-y-8">
      <div className="space-y-1.5">
        <span className="label-mono">/ workspace</span>
        <h1 className="font-semibold text-3xl tracking-tight">Configurações do workspace</h1>
        <p className="text-muted-foreground text-sm">
          Apenas <span className="text-foreground">administradores</span> e o
          <span className="text-foreground"> dono</span> podem mexer aqui.
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-card/40 py-3">
          <CardTitle className="label-mono text-[10px]">/ logo</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <LogoUploader orgSlug={orgSlug} orgName={org.name} currentLogoUrl={org.logo_url} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-card/40 py-3">
          <CardTitle className="label-mono text-[10px]">/ informações</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <OrganizationForm
            orgSlug={orgSlug}
            defaultValues={{ name: org.name, newSlug: org.slug }}
          />
        </CardContent>
      </Card>

      {/* M-10: Danger zone com delete real (owner-only) */}
      {isOwner && (
        <Card className="overflow-hidden border-destructive/30">
          <CardHeader className="border-b border-destructive/20 bg-destructive/5 py-3">
            <CardTitle className="label-mono text-[10px] text-destructive">
              / zona de perigo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-sm text-muted-foreground">
            <DeleteOrgForm orgSlug={orgSlug} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
