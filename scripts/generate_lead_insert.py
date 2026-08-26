import csv, hashlib, json, sys
from datetime import datetime, timezone

filename = sys.argv[1] if len(sys.argv) > 3 else "malaysia_prospects_500.csv"
offset = int(sys.argv[2] if len(sys.argv) > 3 else sys.argv[1]); limit = int(sys.argv[3] if len(sys.argv) > 3 else sys.argv[2])
rows = list(csv.DictReader(open(filename, encoding="utf-8")))[offset:offset+limit]
workspace = "ws-f6da3237-0768-4800-8f66-4a0b73227ab9"
now = datetime.now(timezone.utc).isoformat()
def q(value): return "'" + str(value).replace("'", "''") + "'"
statements = []
for row in rows:
    key = f"{row['companyName']}|{row['city']}|{row['phone']}|{row['osmId']}"
    lead_id = "prospect-" + hashlib.sha1(key.encode()).hexdigest()[:24]
    score = int(row["score"] or 0)
    temperature = "hot" if score >= 70 else "warm" if score >= 40 else "cold"
    lead = {
        "id": lead_id, "workspaceId": workspace, "contactName": row["contactName"], "email": row["email"], "phone": row["phone"],
        "companyName": row["companyName"], "country": row["country"], "status": "imported_review_required", "temperature": temperature, "score": score,
        "source": "OpenStreetMap", "createdAt": now, "updatedAt": now,
        "details": {"website": row["website"], "service": "Custom Website / Website Refresh", "category": row["category"], "city": row["city"], "address": row["address"], "osmId": row["osmId"], "message": row["notes"], "consentStatus": "not_obtained", "outreachStatus": "review_required", "websiteAuditStatus": "pending"}
    }
    data = json.dumps(lead, ensure_ascii=False, separators=(",", ":"))
    statements.append(f"insert into public.bos_records (workspace_id,collection_name,record_id,data,is_soft_deleted,updated_at) values ({q(workspace)},'leads',{q(lead_id)},{q(data)}::jsonb,false,now()) on conflict (workspace_id,collection_name,record_id) do nothing;")
print("\n".join(statements))
