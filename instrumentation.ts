/**
 * Next.js boot hook. Roda 1x quando o processo Node sobe.
 * Docs: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startBackgroundJobs } = await import("@/lib/jobs");
  startBackgroundJobs();
}
