import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/supabase";

const IS_PROD = process.env.NODE_ENV === "production";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            // M-3: força secure + sameSite=Lax em prod, mesmo que Supabase
            // SSR não passe explicit. Em dev (localhost) mantém defaults
            // (secure=false) pra não quebrar HTTP local.
            const hardened = IS_PROD
              ? {
                  ...options,
                  secure: true,
                  sameSite: options?.sameSite ?? "lax",
                  httpOnly: options?.httpOnly ?? true,
                }
              : options;
            supabaseResponse.cookies.set(name, value, hardened);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
