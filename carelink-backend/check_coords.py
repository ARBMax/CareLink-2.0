import httpx

r = httpx.get('http://127.0.0.1:8001/api/incidents')
incidents = r.json().get('incidents', [])
print(f"Total incidents: {len(incidents)}")
for i in incidents:
    code = i.get("code", "?")
    coords = i.get("coords", {})
    title = i.get("title", "?")[:55]
    print(f"  {code} | lat={coords.get('lat')} lng={coords.get('lng')} | {title}")
