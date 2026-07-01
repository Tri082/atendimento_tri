"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logError } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import {
  type ResetPasswordInput,
  resetPasswordSchema,
  type SignInInput,
  type SignUpInput,
  signInSchema,
  signUpSchema,
  type UpdatePasswordInput,
  updatePasswordSchema,
} from "./schemas";

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string };

/**
 * Padding constante reduz timing side-channel em auth.
 * Aplicado em signUp, signIn E reset password (R4-HIGH-3).
 */
const AUTH_MIN_LATENCY_MS = 800;
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function padLatency(startedAt: number): Promise<void> {
  const elapsed = Date.now() - startedAt;
  if (elapsed < AUTH_MIN_LATENCY_MS) {
    await sleep(AUTH_MIN_LATENCY_MS - elapsed);
  }
}

export async function signUpAction(input: SignUpInput): Promise<ActionResult> {
  const startedAt = Date.now();

  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    await padLatency(startedAt);
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    const lower = error.message.toLowerCase();
    if (lower.includes("already registered") || lower.includes("user already")) {
      await padLatency(startedAt);
      return { ok: true };
    }
    await padLatency(startedAt);
    return { ok: false, error: traduzirErroSupabase(error.message) };
  }
  await padLatency(startedAt);
  return { ok: true };
}

export async function signInAction(input: SignInInput): Promise<ActionResult> {
  const startedAt = Date.now();

  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    await padLatency(startedAt);
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    await padLatency(startedAt);
    return {
      ok: false,
      error: "Email ou senha incorretos. Se não confirmou o email ainda, cheque sua caixa.",
    };
  }
  await padLatency(startedAt);
  return { ok: true };
}

/**
 * R4-AUTH-003: try/catch evita silenciar falha de signOut. Se a chamada
 * falhar (network/5xx), loga e re-throw — redirect só roda se signOut
 * realmente revogou a sessão server-side.
 */
export async function signOutAction(): Promise<never> {
  const supabase = await createClient();
  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch (err) {
    logError("auth.signOut", err);
    throw err;
  }
  redirect("/login");
}

/**
 * R4-HIGH-3: padding constante (signUp/signIn já tinham; reset estava sem).
 * `resetPasswordForEmail` tem latência distinta entre email existente
 * (~SMTP enqueue) vs novo (~early return) — atacante mede e enumera.
 */
export async function requestPasswordResetAction(input: ResetPasswordInput): Promise<ActionResult> {
  const startedAt = Date.now();

  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    await padLatency(startedAt);
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Email inválido" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password/confirm`,
  });

  if (error) {
    await padLatency(startedAt);
    return { ok: false, error: traduzirErroSupabase(error.message) };
  }
  await padLatency(startedAt);
  return { ok: true };
}

export async function updatePasswordAction(input: UpdatePasswordInput): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) return { ok: false, error: traduzirErroSupabase(error.message) };

  await supabase.auth.signOut({ scope: "others" });

  const cookieStore = await cookies();
  cookieStore.delete({ name: "recovery_flow", path: "/reset-password" });

  return { ok: true };
}

/**
 * L-1: "sair de todos os dispositivos".
 */
export async function signOutEverywhereAction(): Promise<never> {
  const supabase = await createClient();
  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch (err) {
    logError("auth.signOutEverywhere", err);
    throw err;
  }
  redirect("/login");
}

function traduzirErroSupabase(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("rate limit")) return "Muitas tentativas. Aguarde alguns minutos";
  if (lower.includes("password")) return "Senha não atende aos requisitos mínimos";
  return "Não foi possível completar a operação. Tente novamente.";
}
