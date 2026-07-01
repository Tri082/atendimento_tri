import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "./theme-toggle";
import { UserDropdown } from "./user-dropdown";

type Props = {
  user: {
    fullName: string | null;
    email: string;
    avatarUrl: string | null;
  };
  orgSlug: string;
};

export function AppHeader({ user, orgSlug }: Props) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />

      <div className="flex-1" />

      {/* Environment badge */}
      <div className="hidden items-center gap-1.5 rounded-full border border-border/60 bg-card/60 px-2.5 py-1 sm:flex">
        <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-soft" />
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
          {process.env.NODE_ENV === "production" ? "live" : "dev"}
        </span>
      </div>

      <ThemeToggle />
      <UserDropdown
        fullName={user.fullName}
        email={user.email}
        avatarUrl={user.avatarUrl}
        orgSlug={orgSlug}
      />
    </header>
  );
}
