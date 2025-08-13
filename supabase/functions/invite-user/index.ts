// Supabase Edge Function: invite-user
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
    }
    const { email, name, role, mode, password } = await req.json();
    if (!email) return new Response(JSON.stringify({ error: "email required" }), { status: 400 });
    if (mode === "create" && !password) return new Response(JSON.stringify({ error: "password required for create" }), { status: 400 });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    if (mode === "create") {
      const { data: created, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name }
      });
      if (error) throw error;
      if (role) {
        await supabase.from("profiles").upsert({ id: created.user.id, email, name, role });
      }
      return new Response(JSON.stringify({ ok: true, id: created.user.id }), { status: 200 });
    } else {
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, { data: { name } });
      if (error) throw error;
      if (role) {
        await supabase.from("profiles").insert({ id: data?.user?.id, email, name, role }, { onConflict: "id", ignoreDuplicates: true });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), { status: 500 });
  }
});
