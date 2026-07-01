import {
  ArrowRightIcon,
  CheckIcon,
  CodeIcon,
  DatabaseIcon,
  GaugeIcon,
  LockIcon,
  type LucideIcon,
  TerminalIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { appConfig } from "@/config/app.config";
import { getCurrentUser } from "@/lib/auth/guards";
import { getUserOrgs } from "@/lib/orgs/queries";

export const metadata: Metadata = {
  title: {
    absolute: `${appConfig.name} — Construa seu SaaS como um time de 10`,
  },
  description:
    "Template multi-tenant em Next.js 16 + Supabase com auth, workspaces, dashboard e deploy prontos. Você descreve em português, o Claude Code constrói.",
  alternates: { canonical: "/" },
  openGraph: {
    title: `${appConfig.name} — Construa seu SaaS como um time de 10`,
    description:
      "Template multi-tenant em Next.js 16 + Supabase com auth, workspaces, dashboard e deploy prontos.",
    url: "/",
    type: "website",
  },
  twitter: {
    title: `${appConfig.name} — Construa seu SaaS como um time de 10`,
    description:
      "Template multi-tenant em Next.js 16 + Supabase com auth, workspaces, dashboard e deploy prontos.",
  },
};

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) {
    const orgs = await getUserOrgs(user.id);
    if (orgs.length > 0) redirect(`/app/${orgs[0]!.organization.slug}/dashboard`);
    redirect("/onboarding");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Atmospheric layers */}
      <div className="pointer-events-none absolute inset-0 bg-dot-grid opacity-60" />
      <div className="pointer-events-none absolute inset-0 halo-primary" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(from var(--primary) l c h / 0.6), transparent)",
        }}
      />

      {/* Nav */}
      <Nav />

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pt-24 pb-20 sm:pt-32 sm:pb-28">
        <div className="flex flex-col items-center gap-8 text-center">
          <Badge>
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 pulse-soft" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Template · v1.0 disponível
          </Badge>

          <h1
            className="fade-up max-w-4xl font-semibold text-5xl tracking-tight sm:text-6xl md:text-7xl"
            style={{ animationDelay: "80ms" }}
          >
            Construa seu SaaS
            <br />
            <span className="text-glow-primary text-primary">como um time de 10.</span>
          </h1>

          <p
            className="fade-up max-w-xl text-balance text-muted-foreground sm:text-lg"
            style={{ animationDelay: "180ms" }}
          >
            Template multi-tenant em Next.js + Supabase com tudo que todo SaaS precisa pronto. Você
            descreve em português, o Claude Code constrói.
          </p>

          <div
            className="fade-up flex flex-col items-center gap-3 sm:flex-row"
            style={{ animationDelay: "280ms" }}
          >
            <Button
              render={<Link href="/signup" />}
              nativeButton={false}
              size="lg"
              className="group h-11 gap-2 px-6 text-[15px]"
            >
              Começar agora
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button
              render={<Link href="/login" />}
              nativeButton={false}
              variant="ghost"
              size="lg"
              className="h-11 px-6 text-[15px] text-muted-foreground hover:text-foreground"
            >
              Já tenho conta
            </Button>
          </div>

          {/* Command preview */}
          <div
            className="fade-up mt-4 inline-flex items-center gap-3 rounded-full border border-border/60 bg-card/60 px-4 py-2 backdrop-blur-sm"
            style={{ animationDelay: "380ms" }}
          >
            <TerminalIcon className="h-3.5 w-3.5 text-primary" />
            <code className="font-mono text-xs text-muted-foreground">
              <span className="text-foreground/60">$</span> npx degit nathan/template meu-saas
            </code>
          </div>
        </div>

        {/* Dashboard preview */}
        <div className="fade-up relative mt-20 sm:mt-24" style={{ animationDelay: "500ms" }}>
          <div className="absolute inset-x-0 -top-8 mx-auto h-32 max-w-3xl rounded-full bg-primary/20 blur-3xl" />
          <DashboardPreview />
        </div>
      </section>

      {/* Stack marquee */}
      <section className="relative border-y border-border/60 bg-card/30 py-6">
        <div className="absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
        <div className="absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />
        <div className="flex overflow-hidden">
          <div className="flex animate-marquee shrink-0 items-center gap-12 pr-12">
            {[...stackItems, ...stackItems].map((item, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: marquee duplication
                key={i}
                className="font-mono text-muted-foreground/60 text-sm whitespace-nowrap"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="mb-16 flex flex-col items-center gap-4 text-center">
          <span className="label-mono">/ o que vem pronto</span>
          <h2 className="max-w-2xl font-semibold text-3xl tracking-tight sm:text-4xl">
            A fundação chata, já pronta.
          </h2>
          <p className="max-w-xl text-muted-foreground">
            Auth, multi-tenant, convites, dashboard, deploy. Você foca no que torna seu produto
            único.
          </p>
        </div>

        <div className="grid gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Feature key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative mx-auto max-w-6xl px-6 pb-24 sm:pb-32">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/40 px-8 py-16 text-center sm:px-16 sm:py-24">
          <div className="pointer-events-none absolute inset-0 bg-dot-grid-sm opacity-40" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          <div className="pointer-events-none absolute -inset-x-32 bottom-0 h-48 bg-primary/10 blur-[80px]" />

          <div className="relative flex flex-col items-center gap-6">
            <span className="label-mono">/ pronto?</span>
            <h2 className="max-w-2xl font-semibold text-4xl tracking-tight sm:text-5xl">
              Seu SaaS no ar <span className="text-primary">essa semana.</span>
            </h2>
            <p className="max-w-lg text-muted-foreground">
              Clone, configure em 3 minutos, deploy via EasyPanel. Sem amarras, sem assinatura, sem
              limite de usuários.
            </p>
            <Button
              render={<Link href="/signup" />}
              nativeButton={false}
              size="lg"
              className="group mt-2 h-12 gap-2 px-8 text-base"
            >
              Criar minha conta
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
      <Link href="/" className="flex items-center gap-2.5 group">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
          <span className="font-bold text-sm">T</span>
        </span>
        <span className="font-semibold text-[15px] tracking-tight">Elite da IA - Template</span>
      </Link>
      <div className="flex items-center gap-1">
        <Button
          render={<Link href="/login" />}
          nativeButton={false}
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
        >
          Entrar
        </Button>
        <Button render={<Link href="/signup" />} nativeButton={false} size="sm" className="h-8">
          Começar
        </Button>
      </div>
    </nav>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fade-up inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 font-mono text-[11px] text-muted-foreground backdrop-blur-sm"
      style={{ animationDelay: "0ms" }}
    >
      {children}
    </div>
  );
}

const stackItems = [
  "next.js 16",
  "·",
  "react 19",
  "·",
  "typescript",
  "·",
  "supabase",
  "·",
  "tailwind 4",
  "·",
  "shadcn/ui",
  "·",
  "recharts",
  "·",
  "react hook form",
  "·",
  "zod",
  "·",
  "biome",
  "·",
  "vitest",
  "·",
  "docker",
  "·",
  "easypanel",
];

type FeatureItem = {
  icon: LucideIcon;
  title: string;
  description: string;
  tag: string;
};

const features: FeatureItem[] = [
  {
    tag: "auth",
    icon: LockIcon,
    title: "Autenticação completa",
    description:
      "Signup, login, recuperação de senha e confirmação por email — tudo no padrão Supabase.",
  },
  {
    tag: "multi-tenant",
    icon: DatabaseIcon,
    title: "Workspaces isolados",
    description:
      "Organizações com membros, roles (owner/admin/member) e RLS no Postgres garantindo isolamento.",
  },
  {
    tag: "ui",
    icon: GaugeIcon,
    title: "Dashboard com tema",
    description:
      "KPI cards, gráficos com Recharts, dark mode com accent verde Kawasaki já configurado.",
  },
  {
    tag: "convites",
    icon: ArrowRightIcon,
    title: "Convites por email",
    description:
      "Abstração de Email (Resend + fallback console) com templates React Email já desenhados.",
  },
  {
    tag: "deploy",
    icon: TerminalIcon,
    title: "Pronto pra deploy",
    description:
      "Dockerfile, output standalone do Next.js, guia passo-a-passo pra EasyPanel + SSL.",
  },
  {
    tag: "docs",
    icon: CodeIcon,
    title: "Claude Code first-class",
    description:
      "Hierarquia de CLAUDE.md que orienta o Claude nos padrões do template — você fala em PT-BR, ele segue as regras.",
  },
];

function Feature({ icon: Icon, title, description, tag }: FeatureItem) {
  return (
    <div className="group relative bg-background p-8 transition-colors hover:bg-card/40">
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="grid h-10 w-10 place-items-center rounded-lg border border-border/60 bg-card/60 text-primary transition-colors group-hover:border-primary/40">
            <Icon className="h-4 w-4" />
          </div>
          <span className="label-mono">/{tag}</span>
        </div>
        <div className="space-y-2">
          <h3 className="font-medium text-lg tracking-tight">{title}</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        </div>
        <div className="flex items-center gap-1.5 text-primary text-xs">
          <CheckIcon className="h-3.5 w-3.5" />
          <span className="font-mono uppercase tracking-wider">incluso</span>
        </div>
      </div>
    </div>
  );
}

function DashboardPreview() {
  const kpis = [
    { label: "Usuários", value: "1,234", trend: "+12%" },
    { label: "Retenção", value: "89%", trend: "+3%" },
    { label: "Receita", value: "R$ 4.5k", trend: "+8%" },
    { label: "Conversão", value: "5.8%", trend: "+0.4%" },
  ];

  return (
    <div className="relative mx-auto overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-2xl backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      {/* Window chrome */}
      <div className="flex items-center justify-between border-b border-border/60 bg-card/60 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <div className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <div className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          app.seu-dominio.com.br/app/minha-org/dashboard
        </div>
        <div className="w-12" />
      </div>

      {/* Content */}
      <div className="p-6 sm:p-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="label-mono mb-1.5">/ overview</div>
            <h3 className="font-semibold text-xl">Bem-vindo, Nathan</h3>
          </div>
          <div className="hidden font-mono text-[10px] text-muted-foreground sm:block">
            últimos 30 dias
          </div>
        </div>

        {/* KPIs */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-lg border border-border/60 bg-background/60 p-4">
              <div className="label-mono mb-2 text-[9px]">{k.label}</div>
              <div className="font-semibold text-xl tracking-tight">{k.value}</div>
              <div className="mt-1 font-mono text-[10px] text-primary">↗ {k.trend}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-lg border border-border/60 bg-background/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="label-mono">/ performance</div>
            <div className="font-mono text-[10px] text-muted-foreground">real-time</div>
          </div>
          <MiniChart />
        </div>
      </div>
    </div>
  );
}

function MiniChart() {
  // Static SVG sparkline-style chart
  const points = [
    20, 26, 22, 30, 28, 38, 35, 42, 40, 50, 46, 56, 53, 60, 58, 65, 62, 70, 68, 74, 72, 80, 76, 82,
    80, 86, 84, 90, 88, 92,
  ];
  const max = 100;
  const w = 800;
  const h = 120;
  const stepX = w / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * stepX} ${h - (p / max) * h}`)
    .join(" ");
  const fillPath = `${path} L ${w} ${h} L 0 ${h} Z`;

  return (
    <div className="relative h-32 w-full">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.78 0.22 138)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="oklch(0.78 0.22 138)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1="0"
            y1={h * p}
            x2={w}
            y2={h * p}
            stroke="currentColor"
            strokeOpacity="0.06"
            strokeDasharray="2 4"
          />
        ))}
        <path d={fillPath} fill="url(#fill)" />
        <path
          d={path}
          fill="none"
          stroke="oklch(0.78 0.22 138)"
          strokeWidth="1.5"
          className="sparkline-glow"
        />
      </svg>
    </div>
  );
}

function Footer() {
  return (
    <footer className="relative mx-auto max-w-6xl border-t border-border/60 px-6 py-10">
      <div className="flex flex-col items-center justify-between gap-4 text-sm sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="grid h-5 w-5 place-items-center rounded bg-primary text-primary-foreground">
            <span className="font-bold text-[10px]">T</span>
          </span>
          <span className="font-mono text-muted-foreground text-xs">template-alunos · MIT</span>
        </div>
        <span className="font-mono text-muted-foreground text-xs">
          construído com claude code · 2026
        </span>
      </div>
    </footer>
  );
}
