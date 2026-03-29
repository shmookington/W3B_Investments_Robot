import asyncio
import sys
sys.path.append('/app')
from connectors.sports.espn import ESPNConnector
from connectors.sports.models import SportType
from loguru import logger

async def test():
    e = ESPNConnector()
    await e.connect()
    events = await e.get_scoreboard(SportType.NBA)
    for g in events:
        if "Kings" in getattr(g, "home_team", "") or "Kings" in getattr(g, "away_team", ""):
            print(f"Bypassed Payload -> {g.event_id} | {g.away_team} {g.away_score} vs {g.home_team} {g.home_score} | Clock: {g.display_clock} Q{g.period}")
    await e.disconnect()

if __name__ == "__main__":
    asyncio.run(test())
