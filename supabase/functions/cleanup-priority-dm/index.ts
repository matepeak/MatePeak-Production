import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    console.log("Priority DM cleanup job started");

    // Find all read Priority DMs that are older than 24 hours
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Delete Priority DMs that were read more than 24 hours ago
    const { error: deleteError } = await supabase
      .from("priority_dm_threads")
      .delete()
      .eq("status", "read_by_requester")
      .lte("read_at", twentyFourHoursAgo.toISOString());

    if (deleteError) {
      throw new Error(`Failed to delete old Priority DMs: ${deleteError.message}`);
    }

    // Also mark any deleted ones with delete_after configuration
    const { error: markDeletedError } = await supabase
      .from("priority_dm_threads")
      .update({
        status: "deleted",
        deleted_at: now.toISOString(),
      })
      .not("delete_after", "is", null)
      .lte("delete_after", now.toISOString());

    if (markDeletedError) {
      throw new Error(`Failed to mark expired Priority DMs as deleted: ${markDeletedError.message}`);
    }

    console.log("Priority DM cleanup completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Priority DM cleanup completed",
        timestamp: now.toISOString(),
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Cleanup error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
