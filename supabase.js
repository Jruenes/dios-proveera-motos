import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://ghfgjtdwytcpppcwrjpc.supabase.co";
const SUPABASE_KEY = "sb_publishable_HN3Iu_pdhpQt61K96G7zIw_TjAJDP2t";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
