/* Al Furqan parent portal: connection settings.

   Both values come from the Supabase dashboard, under Project Settings > API
   (or "API Keys"). Use the project URL and the ANON / PUBLISHABLE key.

   That key is designed to be public: it can only do what the database's
   row-level security rules in supabase/schema.sql allow, which is a signed-in
   parent reading and editing their own family's details. It is safe here.

   NEVER put the service_role or secret key in this file, or anywhere in this
   repository - that key bypasses every rule. scripts/check_portal.py fails the
   build if one appears.

   While both values are empty the portal page says it is not open yet, and
   nothing is collected. See PORTAL.md for the full setup. */
window.PORTAL_CONFIG = {
  supabaseUrl: "",
  supabaseAnonKey: ""
};
