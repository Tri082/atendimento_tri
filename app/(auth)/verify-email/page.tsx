export const metadata = { title: "Confirme seu email" };

export default function VerifyEmailPage() {
  return (
    <div className="space-y-3 text-center">
      <h1 className="font-semibold text-2xl">Confirme seu email</h1>
      <p className="text-muted-foreground text-sm">
        Enviamos um link no seu email. Clique para ativar sua conta.
      </p>
      <p className="text-muted-foreground text-xs">Não recebeu? Verifique a caixa de spam.</p>
    </div>
  );
}
