import {
  BriefcaseIcon,
  BuildingIcon,
  CableIcon,
  HomeIcon,
  InboxIcon,
  LayersIcon,
  ListTodoIcon,
  type LucideIcon,
  SparklesIcon,
  TagIcon,
  UserCogIcon,
  UserIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react";

/** Grupos da sidebar, na ordem em que aparecem. */
export type NavGroup = "dia-a-dia" | "crm" | "automacao" | "configuracoes";

export const navGroupOrder: NavGroup[] = [
  "dia-a-dia",
  "crm",
  "automacao",
  "configuracoes",
];

export const navGroupLabels: Record<NavGroup, string> = {
  "dia-a-dia": "dia a dia",
  crm: "CRM",
  automacao: "automação",
  configuracoes: "configurações",
};

export type NavItem = {
  /** Sufixo do path; combinado com /app/{orgSlug} no consumer. */
  path: string;
  label: string;
  icon: LucideIcon;
  /** Em qual seção da sidebar o item aparece. */
  group: NavGroup;
  /** Restringe item a roles específicos. Sem isso, todos os membros veem. */
  roles?: Array<"owner" | "admin" | "member">;
};

/**
 * Navegação da sidebar.
 *
 * Pra adicionar uma nova página, adicione um item aqui e crie a rota em
 * app/(app)/app/[orgSlug]/<sua-pasta>/page.tsx. Escolha o `group` mais
 * próximo do propósito da feature.
 */
export const navItems: NavItem[] = [
  // dia a dia — o que o usuário usa todo dia
  { path: "/dashboard", label: "Início", icon: HomeIcon, group: "dia-a-dia" },
  { path: "/inbox", label: "Inbox", icon: InboxIcon, group: "dia-a-dia" },
  { path: "/tarefas", label: "Tarefas", icon: ListTodoIcon, group: "dia-a-dia" },

  // CRM — entidades de negócio
  { path: "/contatos", label: "Contatos", icon: UsersIcon, group: "crm" },
  { path: "/empresas", label: "Empresas", icon: BuildingIcon, group: "crm" },
  { path: "/deals", label: "Deals", icon: BriefcaseIcon, group: "crm" },

  // automação — features avançadas que admin configura
  {
    path: "/automacoes",
    label: "Automações",
    icon: ZapIcon,
    group: "automacao",
    roles: ["owner", "admin"],
  },
  {
    path: "/settings/agents",
    label: "Agentes IA",
    icon: SparklesIcon,
    group: "automacao",
    roles: ["owner", "admin"],
  },
  {
    path: "/settings/channels",
    label: "Canais",
    icon: CableIcon,
    group: "automacao",
    roles: ["owner", "admin"],
  },

  // configurações — workspace + pessoas + perfil
  {
    path: "/settings/organization",
    label: "Workspace",
    icon: LayersIcon,
    group: "configuracoes",
    roles: ["owner", "admin"],
  },
  {
    path: "/settings/members",
    label: "Membros",
    icon: UserCogIcon,
    group: "configuracoes",
  },
  {
    path: "/settings/tags",
    label: "Tags",
    icon: TagIcon,
    group: "configuracoes",
    roles: ["owner", "admin"],
  },
  { path: "/settings/profile", label: "Meu perfil", icon: UserIcon, group: "configuracoes" },
];
