"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { type UpdateProfileInput, updateProfileSchema } from "./schemas";

export async function updateProfileAction(
  input: UpdateProfileInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("id", user.id);

  if (error) {
    logError("profile.update", error);
    return { ok: false, error: "Erro ao atualizar perfil. Tente novamente." };
  }
  revalidatePath("/app", "layout");
  return { ok: true };
}
