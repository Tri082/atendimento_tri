import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrgMember } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

type Props = { params: Promise<{ orgSlug: string }> };

export const metadata = { title: "Meu perfil" };

export default async function ProfilePage({ params }: Props) {
  const { orgSlug } = await params;
  const { user } = await requireOrgMember({ orgSlug });

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) notFound();

  const display = profile.full_name ?? user.email ?? "Você";

  return (
    <div className="max-w-2xl space-y-8">
      <div className="space-y-1.5">
        <span className="label-mono">/ perfil</span>
        <h1 className="font-semibold text-3xl tracking-tight">Meu perfil</h1>
        <p className="text-muted-foreground text-sm">Como você aparece pros outros membros.</p>
      </div>

      {/* Identity card */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-card/40 py-3">
          <CardTitle className="label-mono text-[10px]">/ identidade</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-16 w-16 ring-1 ring-border">
              <AvatarImage src={profile.avatar_url ?? undefined} alt={display} />
              <AvatarFallback className="bg-muted font-semibold text-xl">
                {display.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-0.5">
              <p className="font-medium text-lg tracking-tight">{display}</p>
              <p className="font-mono text-muted-foreground text-xs">{user.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit card */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-card/40 py-3">
          <CardTitle className="label-mono text-[10px]">/ editar</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ProfileForm defaultValues={{ fullName: profile.full_name ?? "" }} />
        </CardContent>
      </Card>
    </div>
  );
}
