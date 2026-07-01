import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskStatus = Database["public"]["Enums"]["task_status"];
export type TaskPriority = Database["public"]["Enums"]["task_priority"];

export async function getOrgTasks(orgId: string): Promise<Task[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTask(orgId: string, id: string): Promise<Task | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("organization_id", orgId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}
