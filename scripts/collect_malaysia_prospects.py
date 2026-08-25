import csv, json, re, sys, time
from urllib.request import Request, urlopen
from urllib.parse import urlencode

ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"]
CITIES = {
    "Kuala Lumpur": (3.05, 101.60, 3.25, 101.78),
    "Petaling Jaya": (3.05, 101.55, 3.18, 101.68),
    "Shah Alam": (2.95, 101.42, 3.20, 101.62),
    "Johor Bahru": (1.42, 103.60, 1.58, 103.85),
    "George Town": (5.30, 100.22, 5.48, 100.40),
    "Ipoh": (4.45, 101.00, 4.75, 101.25),
    "Melaka": (2.15, 102.15, 2.35, 102.38),
    "Kuching": (1.45, 110.25, 1.65, 110.45),
    "Kota Kinabalu": (5.88, 116.00, 6.10, 116.25),
    "Seremban": (2.60, 101.90, 2.80, 102.10),
    "Kuantan": (3.70, 103.15, 3.90, 103.40),
    "Kota Bharu": (6.00, 102.15, 6.20, 102.35),
    "Alor Setar": (6.05, 100.30, 6.25, 100.50),
    "Miri": (4.30, 113.90, 4.55, 114.10),
}

SHOP_TYPES = "restaurant|cafe|fast_food|beauty|hairdresser|clothes|bakery|florist|car_repair|car|furniture|jewelry|books|electronics|supermarket|convenience|mobile_phone|optician|travel_agency|estate_agent|laundry|pet|gift|craft|hardware|sports|bicycle|shoes|tailor|cosmetics|computer"
AMENITY_TYPES = "restaurant|cafe|fast_food|clinic|dentist|pharmacy|school|kindergarten|fitness_centre|childcare|veterinary|community_centre"

def query_bbox(bbox, endpoint):
    south, west, north, east = bbox
    query = f'''[out:json][timeout:35];(nwr["name"]["shop"]({south},{west},{north},{east});nwr["name"]["amenity"~"{AMENITY_TYPES}"]({south},{west},{north},{east}););out center tags;'''
    request = Request(endpoint, data=urlencode({"data": query}).encode(), headers={"User-Agent": "BennieProspectResearch/1.0 (contact: bennietay.com)"})
    with urlopen(request, timeout=60) as response:
        return json.loads(response.read())

def clean(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()

def main():
    rows, seen = [], set()
    for index, (city, bbox) in enumerate(CITIES.items()):
        try:
            payload = query_bbox(bbox, ENDPOINTS[index % len(ENDPOINTS)])
        except Exception as exc:
            print(f"warning: {city}: {exc}", file=sys.stderr)
            continue
        city_rows = []
        for element in payload.get("elements", []):
            tags = element.get("tags", {})
            name = clean(tags.get("name"))
            if not name or name.lower() in {"shop", "restaurant", "cafe", "clinic"}:
                continue
            key = (name.lower(), clean(tags.get("addr:street")).lower(), city.lower())
            if key in seen: continue
            seen.add(key)
            website = clean(tags.get("website") or tags.get("contact:website"))
            phone = clean(tags.get("phone") or tags.get("contact:phone"))
            email = clean(tags.get("email") or tags.get("contact:email"))
            category = clean(tags.get("shop") or tags.get("amenity") or "local business")
            address = ", ".join(filter(None, [tags.get("addr:housenumber"), tags.get("addr:street"), tags.get("addr:suburb"), city, tags.get("addr:postcode")]))
            score = 55
            if not website: score += 25
            if phone: score += 10
            if email: score += 8
            if category in {"restaurant", "cafe", "beauty", "hairdresser", "clinic", "dentist", "fitness_centre", "estate_agent", "car_repair"}: score += 5
            city_rows.append({"contactName": "Owner / Marketing Manager", "email": email, "phone": phone, "companyName": name, "country": "Malaysia", "website": website, "city": city, "category": category, "address": address, "score": min(score, 100), "source": "OpenStreetMap", "osmId": f"{element.get('type')}/{element.get('id')}", "status": "imported_review_required", "notes": "Public directory prospect. Website audit required before any outreach."})
        city_rows.sort(key=lambda row: (-row["score"], row["companyName"].lower()))
        rows.extend(city_rows[:100])
        print(f"{city}: {len(rows)} candidates", file=sys.stderr)
        time.sleep(1)
    rows.sort(key=lambda row: (-row["score"], row["city"], row["companyName"].lower()))
    rows = rows[:500]
    with open("malaysia_prospects_500.csv", "w", newline="", encoding="utf-8") as output:
        fields = ["contactName", "email", "phone", "companyName", "country", "website", "city", "category", "address", "score", "source", "osmId", "status", "notes"]
        writer = csv.DictWriter(output, fieldnames=fields); writer.writeheader(); writer.writerows(rows)
    print(f"wrote {len(rows)} prospects")

if __name__ == "__main__": main()
