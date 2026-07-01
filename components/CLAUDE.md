# CLAUDE.md — components

## Organização

Três pastas, cada uma com um propósito:

- **`ui/`** — primitivas do shadcn/ui (Button, Card, Input, Dialog, etc.). NÃO editar a mão — instale via `npx shadcn@latest add <nome>`.
- **`app/`** — componentes do "shell" do app (Sidebar, Header, OrgSwitcher, UserDropdown, ThemeToggle). Componentes reutilizáveis específicos do produto.
- **`forms/`** — helpers de formulário (TextField wrapper sobre RHF + shadcn Form).
- **`providers/`** — Provider components (ThemeProvider).

## Como decidir onde criar um componente

```
É uma primitive shadcn que falta?         → npx shadcn@latest add <nome>
É reutilizável globalmente no app?        → components/app/<nome>.tsx
É um wrapper de form?                     → components/forms/<nome>.tsx
Usado só numa página?                     → mesmo diretório da page.tsx,
                                            com sufixo descritivo
                                            (ex: contatos-form.tsx)
```

## Padrões

- **Componentes:** PascalCase, kebab-case nos arquivos (`org-switcher.tsx` exporta `OrgSwitcher`).
- **Client Components:** primeira linha `"use client";` se usa hooks/estado.
- **Server Components:** padrão (não declarar).
- **Render slot:** use `render={<X />}` (base-ui pattern), NÃO `asChild` (que é Radix).
- **Link dentro de Button:** `<Button render={<Link href="..." />} nativeButton={false}>Texto</Button>`.

## shadcn (base-nova preset)

Esse projeto usa o preset **`base-nova`** do shadcn que renderiza sobre `@base-ui/react` (não Radix). Diferenças importantes:

- Slot via `render` prop, não `asChild`.
- Botões precisam de `nativeButton={false}` quando renderizam como `<a>` (Link).
- Algumas APIs de Dialog/DropdownMenu diferem do Radix — leia o componente em `components/ui/` antes de assumir.

### DropdownMenu — pitfalls do base-ui

- **`DropdownMenuLabel` SEMPRE dentro de `DropdownMenuGroup`** (ou `DropdownMenuRadioGroup`). Sem isso, base-ui joga erro `MenuGroupContext is missing` ao abrir. Padrão:
  ```tsx
  <DropdownMenuContent>
    <DropdownMenuGroup>
      <DropdownMenuLabel>Seção</DropdownMenuLabel>
      <DropdownMenuItem>...</DropdownMenuItem>
    </DropdownMenuGroup>
    <DropdownMenuSeparator />
    <DropdownMenuItem>...</DropdownMenuItem>
  </DropdownMenuContent>
  ```
- `DropdownMenuItem` pode ficar fora de Group (ao contrário do Label).
- Para usar Link como item: `<DropdownMenuItem render={<Link href="..." />}>`.

## Acessibilidade

- Toda interação visível precisa ser acessível por teclado.
- Use `aria-label` em botões só com ícone.
- Forms usam `<FormLabel>` (htmlFor automático via `useFormField`).

## Estilo visual ("Operations Terminal")

Tema: dark + accent verde Kawasaki + mono uppercase em labels + glow sutil.

### Padrões obrigatórios

**Header de página:**
```tsx
<div className="space-y-1.5">
  <span className="label-mono">/ nome-da-secao</span>
  <h1 className="font-semibold text-3xl tracking-tight">Título</h1>
  <p className="text-muted-foreground text-sm">Descrição curta.</p>
</div>
```

**Cards de listagem:**
```tsx
<Card>
  <CardHeader className="border-b border-border/60 bg-card/40 py-3">
    <CardTitle className="label-mono text-[10px]">/ seção</CardTitle>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

**Wrapper de página:**
- Listagem: `<div className="space-y-8">`
- Form-focused: `<div className="max-w-2xl space-y-8">`

### Cores e fontes

- Não invente novas cores accent. Tudo via CSS variables em `app/globals.css`.
- Não adicione fontes novas. Stack já configurada: Work Sans (sans) + JetBrains Mono (mono).
