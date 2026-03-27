import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function getStores() {
  const { data, error } = await supabase.from("stores").select("id, store_name, store_id").limit(1);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Stores:", JSON.stringify(data, null, 2));
  }
}

getStores();
