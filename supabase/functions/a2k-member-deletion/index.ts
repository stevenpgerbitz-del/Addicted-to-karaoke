import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const ORIGIN = "https://addictedtokaraoke.com";
const URL = Deno.env.get("SUPABASE_URL") || "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const HEADERS = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};
const respond = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), { status, headers: HEADERS });
const uuid = (v: unknown) => typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const admin = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
type StoredFile = { bucket: string; path: string };
async function removeStorage(files: StoredFile[]) {
  const allowed = new Set(["member-avatars", "venue-community-photos"]);
  const byBucket = new Map<string, string[]>();
  for (const item of files) {
    if (!allowed.has(item?.bucket) || !item.path ||
        item.path.startsWith("/") || item.path.includes("../") || item.path.length > 1000) {
      throw new Error("Member files require manual verification before deletion.");
    }
    if (!byBucket.has(item.bucket)) byBucket.set(item.bucket, []);
    byBucket.get(item.bucket)!.push(item.path);
  }
  for (const [bucket, paths] of byBucket) {
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
      if (error) throw new Error("Could not delete uploaded files; member account was NOT deleted: " + error.message);
    }
  }
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: HEADERS });
  if (req.method !== "POST") return respond(405, { error: "POST only." });
  if (req.headers.get("origin") !== ORIGIN) return respond(403, { error: "Unrecognized site origin." });
  if (!URL || !ANON_KEY || !SERVICE_KEY)
    return respond(503, { error: "Account deletion service is not configured." });
  const bearer = req.headers.get("authorization") || "";
  if (!bearer.startsWith("Bearer ")) return respond(401, { error: "Sign in again to continue." });
  const token = bearer.slice(7);
  try {
    const { data: current, error: authError } = await admin.auth.getUser(token);
    if (authError || !current?.user?.id) return respond(401, { error: "Your member session has expired. Sign in again." });
    const payload = await req.json().catch(() => ({}));
    const action = payload?.action;
    const target = payload?.target || (action === "preview" || action === "delete" ? current.user.id : null);
    if (!uuid(target) || !["preview", "delete"].includes(action))
      return respond(400, { error: "Invalid deletion request." });

    // Reissue this exact JWT to PostgREST. The database independently checks
    // whether the caller can preview/delete the target; no service key used here.
    const caller = createClient(URL, ANON_KEY, {
      global: { headers: { Authorization: "Bearer " + token } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: preview, error: previewError } = await caller.rpc("a2k_member_deletion_preview", { p_target: target });
    if (previewError) return respond(previewError.code === "42501" ? 403 : 409, {
      error: previewError.message || "Could not review this account.",
    });
    if (!preview || preview.user_id !== target)
      return respond(409, { error: "Cannot verify the member deletion preview." });
    const safePreview = {
      target, name: preview.name, member_number: preview.member_number,
      kind: preview.kind, signature: preview.signature,
      content: preview.content, storage_count: preview.storage_count,
    };
    if (action === "preview") return respond(200, { preview: safePreview });

    const confirmedPhrase = preview.kind === "self" ? "DELETE MY ACCOUNT" : "DELETE MEMBER";
    const confirmation = String(payload.confirmation || "");
    const reason = String(payload.reason || "").trim();
    if (confirmation !== confirmedPhrase ||
      (preview.kind === "management" && (reason.length < 5 || reason.length > 400)))
      return respond(400, { error: "The confirmation phrase or reason is incomplete." });
    if (!payload.signature || payload.signature !== preview.signature)
      return respond(409, { error: "This account changed. Please review the updated deletion summary." });
    const files: StoredFile[] = Array.isArray(preview.storage_files) ? preview.storage_files : [];
    if (files.length !== preview.storage_count || files.length > 500)
      return respond(409, { error: "Cannot verify uploaded files; deletion cancelled." });

    // Storage must be cleaned with the Storage API, not direct SQL deletes.
    // All permission checks happen before this irreversible first step.
    await removeStorage(files);
    const { data: deleted, error: deleteError } = await caller.rpc("a2k_member_deletion_execute", {
      p_target: target, p_signature: preview.signature,
      p_confirmation: confirmation, p_reason: reason,
    });
    if (deleteError) return respond(409, {
      error: "Account was not deleted. Some uploaded files may have been removed; contact A2K support. " +
        (deleteError.message || "Please try again."),
    });
    if (!deleted?.deleted) return respond(409, { error: "Account deletion was not confirmed. Contact A2K support." });
    return respond(200, { deleted: true, kind: preview.kind, removed: deleted.content });
  } catch (error) {
    console.error("A2K account deletion error", String(error));
    return respond(503, { error: String(error instanceof Error ? error.message : "Deletion service unavailable.") });
  }
});
