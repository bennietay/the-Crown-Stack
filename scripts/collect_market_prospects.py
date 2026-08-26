import csv, json, re, sys, time
from urllib.request import Request, urlopen
from urllib.parse import urlencode

ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://overpass.nchc.org.tw/api/interpreter"]
MARKETS = {
    "singapore": {
        "country": "Singapore", "output": "singapore_prospects_500.csv",
        "areas": {"Central Singapore": (1.275, 103.78, 1.34, 103.88), "Orchard Singapore": (1.295, 103.81, 1.325, 103.85), "East Singapore": (1.30, 103.88, 1.39, 104.02), "Tampines Singapore": (1.335, 103.92, 1.38, 103.98), "North Singapore": (1.36, 103.78, 1.48, 103.98), "Woodlands Singapore": (1.42, 103.74, 1.46, 103.80), "West Singapore": (1.27, 103.65, 1.40, 103.82), "Jurong Singapore": (1.31, 103.68, 1.37, 103.75), "South Singapore": (1.23, 103.75, 1.30, 103.90), "Sentosa Singapore": (1.235, 103.80, 1.27, 103.86)}
    },
    "uk": {
        "country": "United Kingdom", "output": "uk_prospects_500.csv",
        "areas": {"London": (51.40, -0.55, 51.65, 0.25), "Manchester": (53.35, -2.35, 53.65, -2.05), "Birmingham": (52.38, -2.05, 52.60, -1.70), "Leeds": (53.70, -1.75, 53.95, -1.35), "Bristol": (51.35, -2.75, 51.55, -2.45), "Glasgow": (55.75, -4.45, 56.00, -4.05), "Edinburgh": (55.85, -3.45, 56.05, -3.05), "Liverpool": (53.30, -3.10, 53.55, -2.75), "Cardiff": (51.40, -3.35, 51.60, -3.05), "Belfast": (54.50, -6.15, 54.75, -5.75), "Sheffield": (53.25, -1.65, 53.50, -1.25), "Nottingham": (52.85, -1.35, 53.10, -0.95)}
    }
}
SHOP_TYPES = "restaurant|cafe|fast_food|beauty|hairdresser|clothes|bakery|florist|car_repair|car|furniture|jewelry|books|electronics|supermarket|convenience|mobile_phone|optician|travel_agency|estate_agent|laundry|pet|gift|craft|hardware|sports|bicycle|shoes|tailor|cosmetics|computer"
AMENITY_TYPES = "restaurant|cafe|fast_food|clinic|dentist|pharmacy|school|kindergarten|fitness_centre|childcare|veterinary|community_centre"

def query(bbox, endpoint):
    south, west, north, east = bbox
    body = f'''[out:json][timeout:35];(nwr["name"]["shop"]({south},{west},{north},{east});nwr["name"]["amenity"~"{AMENITY_TYPES}"]({south},{west},{north},{east}););out center tags;'''
    request = Request(endpoint, data=urlencode({"data": body}).encode(), headers={"User-Agent": "BennieProspectResearch/1.0"})
    with urlopen(request, timeout=60) as response: return json.loads(response.read())

def clean(value): return re.sub(r"\s+", " ", str(value or "")).strip()

def main():
    market = sys.argv[1].lower() if len(sys.argv) > 1 else "singapore"
    config = MARKETS[market]; rows=[]; seen=set()
    for index, (city, bbox) in enumerate(config["areas"].items()):
        try: payload=query(bbox, ENDPOINTS[index % len(ENDPOINTS)])
        except Exception as exc: print(f"warning: {city}: {exc}", file=sys.stderr); continue
        city_rows=[]
        for element in payload.get("elements", []):
            tags=element.get("tags", {}); name=clean(tags.get("name"))
            if not name: continue
            key=(name.lower(), clean(tags.get("addr:street")).lower(), city.lower())
            if key in seen: continue
            seen.add(key); website=clean(tags.get("website") or tags.get("contact:website")); phone=clean(tags.get("phone") or tags.get("contact:phone")); email=clean(tags.get("email") or tags.get("contact:email")); category=clean(tags.get("shop") or tags.get("amenity") or "local business")
            address=", ".join(filter(None,[tags.get("addr:housenumber"),tags.get("addr:street"),tags.get("addr:suburb"),city,tags.get("addr:postcode")]))
            score=55+(25 if not website else 0)+(10 if phone else 0)+(8 if email else 0)+(5 if category in {"restaurant","cafe","beauty","hairdresser","clinic","dentist","fitness_centre","estate_agent","car_repair"} else 0)
            city_rows.append({"contactName":"Owner / Marketing Manager","email":email,"phone":phone,"companyName":name,"country":config["country"],"website":website,"city":city,"category":category,"address":address,"score":min(score,100),"source":f"OpenStreetMap {config['country']}","osmId":f"{element.get('type')}/{element.get('id')}","status":"imported_review_required","notes":"Public directory prospect. Website audit required before any outreach."})
        city_rows.sort(key=lambda row:(-row["score"],row["companyName"].lower())); rows.extend(city_rows[:100]); print(f"{city}: {len(rows)} candidates", file=sys.stderr); time.sleep(2)
    rows.sort(key=lambda row:(-row["score"],row["city"],row["companyName"].lower())); rows=rows[:500]
    with open(config["output"],"w",newline="",encoding="utf-8") as output:
        fields=["contactName","email","phone","companyName","country","website","city","category","address","score","source","osmId","status","notes"]; writer=csv.DictWriter(output,fieldnames=fields); writer.writeheader(); writer.writerows(rows)
    print(f"wrote {len(rows)} prospects")

if __name__ == "__main__": main()
