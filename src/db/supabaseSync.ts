/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from "./supabase";

const COLLECTIONS_TO_SYNC = [
  "settings",
  "leads",
  "interactions",
  "tasks",
  "scripts",
  "resources",
  "webinars",
  "webinar_pages",
  "webinar_registrations",
  "payments",
  "content_posts",
  "referrals",
  "events",
  "utm_links",
  "qr_codes",
  "products",
  "product_imports",
  "orders",
  "order_items",
  "bundles",
  "bundle_items",
];

function getCollectionName(key: string): string {
  return key.replace("pf_", "");
}

async function getUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

function toRows(userId: string, collectionName: string, data: any) {
  if (collectionName === "settings") {
    return [{
      user_id: userId,
      collection_name: collectionName,
      record_id: "global",
      data,
    }];
  }

  if (!Array.isArray(data)) {
    const recordId = data?.id || "global";
    return [{
      user_id: userId,
      collection_name: collectionName,
      record_id: recordId,
      data,
    }];
  }

  return data
    .filter((item) => item && item.id)
    .map((item) => ({
      user_id: userId,
      collection_name: collectionName,
      record_id: item.id,
      data: item,
    }));
}

export async function syncToSupabase(key: string, data: any) {
  if (!supabase) return;
  const userId = await getUserId();
  if (!userId) return;

  const collectionName = getCollectionName(key);
  const rows = toRows(userId, collectionName, data);
  if (rows.length === 0) return;

  const { error } = await supabase
    .from("workspace_records")
    .upsert(rows, { onConflict: "user_id,collection_name,record_id" });

  if (error) {
    console.error("Supabase sync error for key:", key, error);
  }
}

export async function deleteFromSupabase(key: string, recordId: string) {
  if (!supabase) return;
  const userId = await getUserId();
  if (!userId) return;

  const { error } = await supabase
    .from("workspace_records")
    .delete()
    .eq("user_id", userId)
    .eq("collection_name", getCollectionName(key))
    .eq("record_id", recordId);

  if (error) {
    console.error("Supabase delete error for key:", key, error);
  }
}

export async function pullFromSupabase(): Promise<boolean> {
  if (!supabase) return false;
  const userId = await getUserId();
  if (!userId) return false;

  const { data, error } = await supabase
    .from("workspace_records")
    .select("collection_name,record_id,data")
    .eq("user_id", userId);

  if (error) {
    console.error("Error pulling workspace from Supabase:", error);
    return false;
  }

  const grouped = new Map<string, any[]>();
  for (const row of data || []) {
    if (row.collection_name === "settings") {
      localStorage.setItem("pf_settings", JSON.stringify(row.data));
      continue;
    }
    const existing = grouped.get(row.collection_name) || [];
    existing.push(row.data);
    grouped.set(row.collection_name, existing);
  }

  for (const [collectionName, items] of grouped.entries()) {
    localStorage.setItem(`pf_${collectionName}`, JSON.stringify(items));
  }

  return true;
}

export async function pushLocalToSupabase() {
  if (!supabase) return;
  const userId = await getUserId();
  if (!userId) return;

  for (const collectionName of COLLECTIONS_TO_SYNC) {
    try {
      const raw = localStorage.getItem(`pf_${collectionName}`);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const rows = toRows(userId, collectionName, parsed);
      for (let index = 0; index < rows.length; index += 500) {
        const batch = rows.slice(index, index + 500);
        const { error } = await supabase
          .from("workspace_records")
          .upsert(batch, { onConflict: "user_id,collection_name,record_id" });
        if (error) throw error;
      }
    } catch (error) {
      console.error(`Error pushing ${collectionName} to Supabase:`, error);
    }
  }
}
