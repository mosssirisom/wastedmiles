# Supabase setup

Run the migrations in this folder against the Wasted Miles Supabase project.

Recommended first command after installing the Supabase CLI:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

Never put the Supabase service-role key in Vite environment variables. Only use the anon public key in the browser.
