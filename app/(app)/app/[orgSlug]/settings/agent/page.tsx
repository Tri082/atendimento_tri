import { redirect } from "next/navigation";

type Props = { params: Promise<{ orgSlug: string }> };

export default async function AgentRootRedirect({ params }: Props) {
  const { orgSlug } = await params;
  redirect(`/app/${orgSlug}/settings/agents`);
}
