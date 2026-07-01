export interface MessagingErrorOpts {
  code: string;
  publicMessage: string;
  retriable: boolean;
  cause?: unknown;
}

export class MessagingError extends Error {
  readonly code: string;
  readonly publicMessage: string;
  readonly retriable: boolean;

  constructor(opts: MessagingErrorOpts) {
    super(opts.publicMessage);
    this.name = "MessagingError";
    this.code = opts.code;
    this.publicMessage = opts.publicMessage;
    this.retriable = opts.retriable;
    if (opts.cause) (this as unknown as { cause: unknown }).cause = opts.cause;
  }
}

const GENERIC = "Não foi possível enviar a mensagem. Tente novamente em instantes.";

export function translateError(err: unknown): string {
  if (err instanceof MessagingError) return err.publicMessage;

  const obj = err as { code?: string; message?: string } | null;
  if (obj && typeof obj.code === "string") {
    switch (obj.code) {
      case "PGRST116":
        return "Item não encontrado.";
      case "23505":
        return "Registro duplicado.";
      case "23503":
        return "Referência inválida.";
    }
  }

  return GENERIC;
}

export function isRetriable(err: unknown): boolean {
  return err instanceof MessagingError && err.retriable;
}
