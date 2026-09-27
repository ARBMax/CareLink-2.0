import asyncio
from scrapers.news_scraper import NewsScraper

async def run():
    print("Running scrapers manually...")
    scraper = NewsScraper()
    await scraper.poll_and_ingest()
    print("Done!")

if __name__ == '__main__':
    asyncio.run(run())
