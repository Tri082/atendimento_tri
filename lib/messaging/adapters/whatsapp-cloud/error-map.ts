import { MessagingError } from "@/lib/messaging/errors";

interface MetaErrorPayload {
  error?: {
    code?: number;
    message?: string;
    error_subcode?: number;
    error_data?: { details?: string };
  };
}

const TABLE: Record<number, { code: string; publicMessage: string; retriable: boolean }> = {
  131026: { code: "recipient_not_opted_in", publicMessage: "Esse contato não autorizou receber mensagens.", retriable: false },
  131047: { code: "re_engagement_required", publicMessage: "Fora da janela de 24h. Use um template pra iniciar conversa.", retriable: false },
  131051: { code: "unsupported_message_type", publicMessage: "Tipo de mídia não suportado.", retriable: false },
  131053: { code: "media_upload_error", publicMessage: "Não foi possível enviar essa mídia.", retriable: false },
  80007: { code: "rate_limit", publicMessage: "Muitas mensagens. Tente em 1 minuto.", retriable: true },
  4: { code: "app_rate_limit", publicMessage: "Limite da Meta atingido. Tente novamente em alguns minutos.", retriable: true },
  190: { code: "token_expired", publicMessage: "Token do WhatsApp expirou. Reconecte o canal.", retriable: false },
  100: { code: "invalid_param", publicMessage: "Parâmetro inválido na mensagem.", retriable: false },
  368: { code: "blocked_user", publicMessage: "Esse usuário bloqueou ou foi bloqueado.", retriable: false },
};

export function mapMetaError(payload: unknown): MessagingError {
  const p = (payload ?? {}) as MetaErrorPayload;
  const code = p.error?.code;
  const msg = p.error?.message ?? "";

  if (typeof code === "number" && TABLE[code]) {
    return new MessagingError({ ...TABLE[code], cause: payload });
  }

  return new MessagingError({
    code: "meta_unknown",
    publicMessage: `Erro Meta (cod ${code ?? "?"}): ${msg.slice(0, 100) || "verifique a configuração"}.`,
    retriable: false,
    cause: payload,
  });
}
