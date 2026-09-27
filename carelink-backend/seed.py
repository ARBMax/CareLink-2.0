import httpx
import asyncio

async def seed():
    data = {
        'title': 'Severe Monsoonal Flooding - Kathmandu Valley',
        'category': 'FLOOD',
        'urgency': 'CRITICAL',
        'coords': {'lat': 27.7172, 'lng': 85.3240},
        'location_name': 'Kathmandu Valley',
        'country': 'Nepal',
        'region': 'Asia-Pacific',
        'severity_score': 92,
        'population_affected': 2000000,
        'casualties_confirmed': 200,
        'casualties_missing': 50,
        'displaced_count': 50000,
        'description': 'Unprecedented monsoon rains have caused severe flooding across the Kathmandu Valley. Critical infrastructure damaged.',
        'extracted_needs': ['Clean Water', 'Medical Supplies', 'Evacuation Boats'],
        'required_skills': ['Search and Rescue', 'Emergency Medicine'],
        'source': 'Manual Entry'
    }
    async with httpx.AsyncClient() as client:
        r = await client.post('http://127.0.0.1:8001/api/incidents', json=data)
        print(r.status_code, r.text)

asyncio.run(seed())
