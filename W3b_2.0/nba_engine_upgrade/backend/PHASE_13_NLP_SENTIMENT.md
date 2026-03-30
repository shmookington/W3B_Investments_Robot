# Phase 9: NLP & Sentiment Intelligence
### *Processing News, Social Media, and Coach Signals Before the Market Reacts*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Jim Simons Link:** RenTech was one of the first funds to process news feeds algorithmically. They acted on information *minutes* before other traders realized its significance.
> **Priority:** 🟡 High | **Estimated Effort:** 4-6 days | **Impact:** Early injury detection + sentiment edge

---

## Overview

By the time an injury appears on the official NBA injury report, Vegas has already adjusted the line. The edge is in detecting the injury 30-60 minutes **before** the official report — from a reporter's tweet, a beat writer's article, or a coach's suspicious press conference comment.

---

## Step 9.1 — Real-Time NBA News Processing

### File: `NEW → monolith/data/news_processor.py`

### Data Sources (Priority Order)
```python
NEWS_SOURCES = {
    # Tier 1: Breaking news (fastest, most impactful)
    "twitter_nba_insiders": {
        "accounts": [
            "ShamsCharania",   # Shams Charania — breaks 40% of NBA news
            "wojespn",         # Adrian Wojnarowski (retired but still influential)
            "ChrisBHaynes",    # Chris Haynes
            "JakeLFischer",    # Jake Fischer
            "KeithSmithNBA",   # Keith Smith — salary/roster moves
        ],
        "check_interval_seconds": 60,
        "latency": "1-5 minutes ahead of official reports",
    },
    
    # Tier 2: Team beat writers (earlier than official, later than insiders)
    "beat_writers": {
        "method": "RSS feeds from team-specific beat writers",
        "check_interval_seconds": 120,
        "latency": "5-15 minutes ahead of official",
    },
    
    # Tier 3: Official sources (final confirmation)
    "official_nba": {
        "method": "NBA injury report API",
        "check_interval_seconds": 300,
        "latency": "baseline — everyone sees this simultaneously",
    },
}
```

### NLP Pipeline
```python
class NBANewsProcessor:
    """
    Processes NBA news in real-time and extracts actionable signals.
    
    Pipeline:
    1. Fetch → 2. Classify → 3. Extract entities → 4. Score impact → 5. Alert
    """
    
    def classify_news(self, text: str) -> dict:
        """
        Classify a news item into categories and extract impact.
        
        Categories:
        - INJURY_NEW: Player newly injured/ruled out
        - INJURY_RETURN: Player returning from injury
        - TRADE: Player traded to new team
        - LINEUP: Starting lineup change
        - REST: Star being rested (load management)
        - SUSPENSION: Player suspended
        - PERSONAL: Player out for personal reasons
        - IRRELEVANT: Not game-impacting
        """
        # Keyword patterns for high-confidence classification
        patterns = {
            "INJURY_NEW": [
                r"(ruled out|will not play|sidelined|out tonight|will miss)",
                r"(suffered|sustained|dealing with|nursing).*(injury|sprain|strain|soreness)",
                r"(OUT|DNP).*for.*game",
            ],
            "INJURY_RETURN": [
                r"(cleared to play|will return|back in lineup|available tonight)",
                r"(upgraded|probable|expected to play)",
            ],
            "REST": [
                r"(load management|rest|sitting out|DNP.*rest)",
                r"(will not play.*rest|resting)",
            ],
            "TRADE": [
                r"(traded|acquired|sends.*to|deal complete|officially traded)",
            ],
        }
        
    def extract_entities(self, text: str) -> dict:
        """
        Extract player name, team, and game date from news text.
        
        Uses NER (Named Entity Recognition) + team/player database matching.
        """
        
    def score_impact(self, category: str, player: str) -> float:
        """
        Convert news item into Elo impact score.
        Cross-references player stats database (Phase 3).
        """
        if category == "INJURY_NEW":
            player_bpm = self.player_db.get_bpm(player)
            return -player_bpm * 12  # Convert BPM to Elo impact
        elif category == "INJURY_RETURN":
            player_bpm = self.player_db.get_bpm(player)
            return player_bpm * 8  # Returning isn't full impact (rusty)
```

### The Speed Advantage
```
Timeline of a typical injury:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3:15 PM: Player tweaks ankle in shootaround
3:30 PM: Insider tweets "hearing [player] is questionable"
              ← WE DETECT HERE (15 min edge)
3:45 PM: Beat writer confirms, adds details
4:00 PM: Team announces player is questionable
4:30 PM: Vegas adjusts line by 2-3 points
5:00 PM: Official NBA injury report released
              ← EVERYONE ELSE SEES IT HERE

Our edge window: 60-90 minutes before the market fully prices it in.
On a player worth 5+ points off the spread, this is massive.
```

---

## Step 9.2 — Sentiment Analysis Engine

### File: `NEW → monolith/models/sentiment/sentiment_engine.py`

```python
from transformers import pipeline

class NBASentimentEngine:
    """
    Analyzes the sentiment and urgency of NBA-related text.
    Uses fine-tuned transformer for sports-specific sentiment.
    """
    
    def __init__(self):
        self.classifier = pipeline(
            "sentiment-analysis",
            model="distilbert-base-uncased-finetuned-sst-2-english"
        )
    
    def analyze_coach_language(self, quotes: List[str]) -> dict:
        """
        Coaches give subtle signals in press conferences.
        
        Bullish patterns (team likely to perform well):
        - "We've been locked in at practice"
        - "Everyone is healthy and ready"
        - "This is a big game for us"
        
        Bearish patterns (team likely to underperform):
        - "We're still working through some things"
        - "Trying to manage minutes"
        - "It's a long season"  ← code for "we might not try hard tonight"
        - "We'll see how he feels" ← code for "star might sit"
        """
        
    def analyze_player_social(self, team: str) -> dict:
        """
        Aggregate player social media sentiment.
        
        Signals:
        - Players posting workout videos = motivated
        - Players posting about outside interests = distracted
        - Players liking trade rumors = locker room issues
        - Players going dark on social media = focused (bullish)
        """
    
    def analyze_beat_writer_tone(self, articles: List[str]) -> dict:
        """
        Beat writers who cover teams daily have the best insider knowledge.
        Their word choice reveals information they can't explicitly report.
        
        "Sources say the team is confident" = bullish
        "The mood around the team has shifted" = bearish
        "There are questions about..." = something is wrong
        """
```

---

## Step 9.3 — Trade Rumor Impact Model

### File: `NEW → monolith/models/sentiment/trade_impact.py`

```python
class TradeRumorImpact:
    """
    Detect and price the impact of trade rumors before the trade happens.
    
    When trade rumors surface:
    - The player being traded often mentally checks out (-20 Elo)
    - The team considering trading becomes uncertain (-10 Elo)
    - The potential acquiring team gets a motivation boost (+5 Elo)
    
    These effects happen DAYS before the actual trade.
    """
    
    def detect_trade_window(self, game_date: date) -> bool:
        """
        NBA trade deadline is in February. The 2 weeks before the
        deadline are maximum chaos for betting markets.
        """
        
    def estimate_trade_disruption(self, team: str, rumors: List[TradeRumor]) -> float:
        """
        Quantify how much active trade rumors disrupt team performance.
        
        Star being shopped: -15 Elo (player is distracted)
        Multiple players in rumors: -25 Elo (whole team unsettled)
        Team is buying (acquiring talent): +5 Elo (excitement)
        """
```

---

## XGBoost Features from Phase 9

| Feature | Source | Description |
|---------|--------|-------------|
| `news_impact_score` | 9.1 | Aggregate Elo impact of recent news items |
| `news_velocity` | 9.1 | How much news in last 24h (high velocity = something happening) |
| `coach_sentiment` | 9.2 | Bullish/bearish from pre-game presser |
| `social_sentiment` | 9.2 | Team social media mood aggregate |
| `trade_disruption` | 9.3 | Active trade rumors disruption score |

## Dependencies
- `transformers` (Hugging Face, for NLP models)
- `tweepy` or X API access (for real-time tweet monitoring)
- RSS feed parser (for beat writer articles)
- Pre-trained sentiment model (DistilBERT, free)
