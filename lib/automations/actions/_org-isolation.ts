import { createServiceClient } from "@/lib/supabase/service";

type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

/**
 * Sub-H C-2: garante que `id` da tabela existe e pertence à org.
 * Levanta com mensagem leiga se o registro não for da organização.
 * Aplicar SEMPRE no início do `execute` de qualquer action que receba ID de entidade
 * vinda de input do aluno (campo do schema), pois `{{contact.id}}` no payload do trigger
 * pode ser falsificado se vier de um payload customizado de dry-run.
 */
export async function assertOrgOwns(
  supabase: SupabaseServiceClient,
  table: "contacts" | "deals" | "conversations" | "tasks" | "companies" | "tags",
  id: string,
  orgId: string,
  actionId: string,
): Promise<void> {
  const { data } = await supabase
    .from(table)
    .select("id")
    .eq("id", id)
    .eq("organization_id", orgId)
    .maybeSingle();
  if (!data) {
    throw new Error(
      `${actionId}: registro não pertence à organização (${table} ${id.slice(0, 8)}…)`,
    );
  }
}

/**
 * Sub-H C-1: garante que `userId` é membro da org.
 * Defesa em profundidade pra UUID literal de assignee/assigned_to.
 */
export async function assertOrgMember(
  supabase: SupabaseServiceClient,
  userId: string,
  orgId: string,
  actionId: string,
): Promise<void> {
  const { data } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) {
    throw new Error(`${actionId}: usuário não é membro dessa organização`);
  }
}
