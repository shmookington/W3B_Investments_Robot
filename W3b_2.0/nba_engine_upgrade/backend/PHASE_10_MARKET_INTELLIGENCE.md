# Phase 5: Market Intelligence
### *Line Movement, Sharp Money Detection, and Closing Line Value*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Priority:** 🟢 Medium | **Estimated Effort:** 3-4 days | **Impact:** Validation + confidence calibration
> **Depends on:** Phase 1 (Game Results), Phase 2 (Live Context)

---

## Overview

Phases 1-4 build the predictive model. This phase asks the critical question: **is the model actually finding real edges, or is it just hallucinating?** By tracking how our predictions compare to the closing line (the final odds at tip-off), we get an objective answer. CLV (Closing Line Value) is the gold standard metric used by every professional sports bettor to measure if their model truly has an edge.

---

## Step 5.1 — Multi-Book Odds Tracker

### Objective
Record the opening line, current line, and closing line for every NBA game from multiple sportsbooks.

### Data Source: The Odds API (Free Tier)
```
GET https://api.the-odds-api.com/v4/sports/basketball_nba/odds/
    ?apiKey={KEY}
    &regions=us
    &markets=h2h,spreads,totals
    &oddsFormat=american
    &bookmakers=draftkings,fanduel,betmgm,pointsbet
```

- **Free tier:** 500 requests/month (enough for ~16 games/day × 30 days)
- Returns odds from DraftKings, FanDuel, BetMGM, PointsBet simultaneously
- Markets: Moneyline (`h2h`), spread (`spreads`), total (`totals`)

### Database Schema
```sql
CREATE TABLE nba_odds_snapshots (
    id              SERIAL PRIMARY KEY,
    espn_event_id   VARCHAR(50) NOT NULL,
    game_date       DATE NOT NULL,
    snapshot_time   TIMESTAMP NOT NULL,
    snapshot_type   VARCHAR(20) NOT NULL,        -- 'opening', 'current', 'closing'
    -- Home team odds
    home_team       VARCHAR(50) NOT NULL,
    home_ml         INTEGER,                     -- American odds e.g. -150
    home_spread     FLOAT,                       -- e.g. -5.5
    home_spread_odds INTEGER,                    -- e.g. -110
    -- Away team odds
    away_team       VARCHAR(50) NOT NULL,
    away_ml         INTEGER,                     -- American odds e.g. +130
    away_spread     FLOAT,                       -- e.g. +5.5
    away_spread_odds INTEGER,                    -- e.g. -110
    -- Total
    total_line      FLOAT,                       -- e.g. 215.5
    -- Source
    sportsbook      VARCHAR(30) NOT NULL,        -- 'draftkings', 'fanduel', etc.
    -- Derived
    home_implied_prob FLOAT,                     -- Calculated from ML odds
    away_implied_prob FLOAT,
    created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_odds_event ON nba_odds_snapshots(espn_event_id, snapshot_type);
CREATE INDEX idx_odds_date ON nba_odds_snapshots(game_date);
```

### American Odds → Implied Probability Conversion
```python
def american_to_implied_prob(odds: int) -> float:
    """
    Convert American odds to implied probability.
    
    -150 → 0.600 (60.0%)
    +130 → 0.435 (43.5%)
    -110 → 0.524 (52.4%)
    """
    if odds < 0:
        return abs(odds) / (abs(odds) + 100)
    else:
        return 100 / (odds + 100)
```

### Snapshot Schedule
```python
SNAPSHOT_SCHEDULE = {
    "opening": "First available odds (typically 24h before tip)",
    "morning": "10:00 AM ET on game day",
    "afternoon": "3:00 PM ET on game day", 
    "pregame": "30 minutes before tip (after lineup announcements)",
    "closing": "At tip-off (final line)",
}
```

### File: `NEW → monolith/data/line_tracker.py`

```python
class NBALineTracker:
    """
    Tracks odds movement from opening to closing for all NBA games.
    Uses The Odds API for multi-book data.
    """
    
    async def snapshot_current_odds(self, snapshot_type: str = "current"):
        """Fetch current odds from all sportsbooks and store snapshot."""
        
    def get_opening_line(self, event_id: str) -> OddsSnapshot:
        """Get the earliest recorded odds for a game."""
        
    def get_closing_line(self, event_id: str) -> OddsSnapshot:
        """Get the final odds at tip-off."""
        
    def get_line_movement(self, event_id: str) -> LineMovement:
        """
        Calculate how much the line moved from open to close.
        
        Returns: spread_move, ml_move, total_move
        Example: spread opened PHI -3.5, closed PHI -5.5 → moved 2 points
        """
        
    def get_consensus_line(self, event_id: str) -> ConsensusOdds:
        """
        Average odds across all tracked sportsbooks.
        More reliable than a single book's line.
        """
```

### Verification
- [ ] Capture opening odds for tonight's games → verify data format is correct
- [ ] Compare captured odds to what ESPN/DraftKings shows → should match within 1-2 points
- [ ] Verify American → implied probability conversion matches known values

---

## Step 5.2 — Closing Line Value (CLV) Tracker

### Objective
The #1 metric for validating the model. If we can consistently generate signals at better prices than the closing line, we have a mathematically proven edge. This is the ultimate test of profitability.

### What is CLV?
```
CLV = Our Model's Probability at Signal Time - Closing Line Probability

Example:
- At 3:00 PM, our model says Lakers have a 58% chance to win
- At tip-off (7:00 PM), the closing line implies Lakers have a 62% chance
- CLV = 58% - 62% = -4% → We got a WORSE price (bad)

Better example:
- At 3:00 PM, our model says Lakers have a 58% chance to win
- At tip-off, closing line implies Lakers have a 52% chance
- CLV = 58% - 52% = +6% → We got a BETTER price (good!)
```

### File: `NEW → monolith/analytics/clv_tracker.py`

```python
class CLVTracker:
    """
    Tracks every signal we generate and compares it to the closing line
    to determine if our model consistently finds value.
    """
    
    def record_signal(self, signal: Signal, current_market_prob: float):
        """Log a signal at the time it was generated."""
        
    async def calculate_clv_after_game(self, event_id: str):
        """
        After the game starts, look up the closing line and calculate CLV.
        Called automatically by the results collector.
        """
        signal = self.get_signal_for_event(event_id)
        closing = self.line_tracker.get_closing_line(event_id)
        
        signal_prob = signal.model_probability
        closing_prob = closing.home_implied_prob if signal.side == "home" else closing.away_implied_prob
        
        # Remove vig from closing line for fair comparison
        closing_prob_no_vig = remove_vig(closing_prob, 1 - closing_prob)
        
        clv = signal_prob - closing_prob_no_vig
        
        self.store_clv(signal.signal_id, event_id, signal_prob, closing_prob_no_vig, clv)
    
    def get_clv_summary(self, days: int = 30) -> CLVSummary:
        """
        Rolling CLV performance report.
        
        Returns:
        - avg_clv: Average CLV per signal (target: > +1.5 cents)
        - clv_positive_rate: % of signals with positive CLV (target: > 52%)
        - total_signals: Number of signals analyzed
        - win_rate: Actual win rate on our signals
        - expected_win_rate: What our closing CLV predicts
        """
```

### Database Schema
```sql
CREATE TABLE nba_clv_log (
    id                  SERIAL PRIMARY KEY,
    signal_id           VARCHAR(50) NOT NULL,
    espn_event_id       VARCHAR(50) NOT NULL,
    game_date           DATE NOT NULL,
    -- Signal data (at generation time)
    signal_prob         FLOAT NOT NULL,          -- Our model's probability
    signal_side         VARCHAR(10) NOT NULL,     -- 'home' or 'away'
    signal_edge         FLOAT NOT NULL,          -- Edge at signal time
    signal_confidence   VARCHAR(20),             -- EXTREME, HIGH, etc.
    -- Closing data
    closing_prob        FLOAT,                   -- Closing line implied probability (no vig)
    -- CLV calculation
    clv                 FLOAT,                   -- signal_prob - closing_prob
    clv_cents           FLOAT,                   -- CLV in cents (×100)
    -- Result
    signal_won          BOOLEAN,                 -- Did our signal win?
    actual_margin       INTEGER,                 -- Point margin
    -- Meta
    created_at          TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_clv_date ON nba_clv_log(game_date);
```

### Removing Vigorish (Vig)
```python
def remove_vig(prob_a: float, prob_b: float) -> tuple:
    """
    Sportsbooks add ~4.5% vig (overround).
    Remove it to get true probabilities.
    
    Example: -110/-110 → 52.4%/52.4% (sums to 104.8%)
    No-vig: 50%/50% (sums to 100%)
    """
    total = prob_a + prob_b
    return prob_a / total, prob_b / total
```

### CLV Interpretation Guide
| Avg CLV | Meaning | Action |
|---------|---------|--------|
| > +3.0% | Elite edge, model is exceptional | Increase position sizes |
| +1.5% to +3.0% | Solid edge, profitable long-term | Standard sizing |
| +0.5% to +1.5% | Marginal edge, might be profitable after vig | Conservative sizing |
| -0.5% to +0.5% | No edge, basically random | Do NOT bet real money |
| < -0.5% | Negative edge, model is worse than market | Turn off signals, retrain |

### Verification
- [ ] After 50+ signals, calculate rolling CLV
- [ ] Compare CLV to actual win rate — they should roughly correlate
- [ ] If CLV is consistently negative, model needs improvement before Phase 6

---

## Step 5.3 — Sharp vs Public Money Detection

### Objective
When "sharp" bettors (professionals) agree with our model, boost confidence. When they disagree, reduce confidence.

### File: `NEW → monolith/analytics/sharp_detector.py`

### How to Detect Sharp Action
```python
class SharpDetector:
    def detect_sharp_action(self, event_id: str) -> SharpSignal:
        """
        Sharp money is detected through "Reverse Line Movement" (RLM):
        - The public is betting heavily on Team A (70% of bets)
        - But the line is moving TOWARD Team B (books are taking sharp money on B)
        - This means sharps are on Team B
        
        Also detected through:
        - Sudden line moves of 1+ point in < 30 minutes
        - Line moves after known sharp bettor accounts place bets
        """
        opening = self.line_tracker.get_opening_line(event_id)
        current = self.line_tracker.get_latest_snapshot(event_id)
        
        spread_move = current.home_spread - opening.home_spread
        
        # If line moved significantly → sharp action detected
        if abs(spread_move) >= 1.5:
            sharp_side = "home" if spread_move < 0 else "away"
            return SharpSignal(
                side=sharp_side,
                magnitude=abs(spread_move),
                confidence="high" if abs(spread_move) >= 2.5 else "medium"
            )
        
        return None
    
    def align_with_model(self, signal: Signal, sharp: SharpSignal) -> str:
        """
        If sharps agree with our model → BOOST confidence
        If sharps disagree → REDUCE confidence
        """
        if sharp is None:
            return "neutral"  # No sharp action detected
        
        if signal.side == sharp.side:
            return "aligned"   # Sharps agree → boost to EXTREME
        else:
            return "opposed"   # Sharps disagree → downgrade confidence
```

### Confidence Adjustment Rules
```python
SHARP_CONFIDENCE_MAP = {
    "aligned_high": +2,      # Sharps strongly agree → EXTREME
    "aligned_medium": +1,    # Sharps mildly agree → boost one tier  
    "neutral": 0,             # No sharp action → no change
    "opposed_medium": -1,    # Sharps mildly disagree → drop one tier
    "opposed_high": -2,      # Sharps strongly disagree → drop two tiers
}
```

### Verification
- [ ] Track games where sharp action was detected → do sharps win > 55%?
- [ ] When sharps align with our model → does combined win rate exceed either individually?
- [ ] Verify line movement detection correctly identifies 1.5+ point moves

---

## Step 5.4 — Steam Move Alerts

### Objective
Detect coordinated line movements across multiple sportsbooks simultaneously — the strongest possible sharp signal.

### File: `NEW → monolith/analytics/steam_moves.py`

```python
class SteamMoveDetector:
    def check_for_steam(self, event_id: str) -> SteamMove:
        """
        A steam move occurs when 3+ sportsbooks move their line
        in the same direction within a 10-minute window.
        
        This indicates a large betting syndicate or a single sharp
        account hitting every book simultaneously.
        """
        snapshots = self.line_tracker.get_recent_snapshots(event_id, minutes=10)
        
        books_moved = {}
        for snapshot in snapshots:
            prev = self.line_tracker.get_previous_snapshot(event_id, snapshot.sportsbook)
            if prev and abs(snapshot.home_spread - prev.home_spread) >= 0.5:
                direction = "home" if snapshot.home_spread < prev.home_spread else "away"
                books_moved[snapshot.sportsbook] = direction
        
        # Steam = 3+ books moved same direction within window
        if len(books_moved) >= 3:
            directions = list(books_moved.values())
            if directions.count(directions[0]) >= 3:
                return SteamMove(
                    side=directions[0],
                    books_count=len(books_moved),
                    timestamp=datetime.utcnow()
                )
        
        return None
    
    async def alert_if_aligned(self, steam: SteamMove, active_signals: List[Signal]):
        """Send Telegram alert if steam move aligns with an active signal."""
        for signal in active_signals:
            if steam.side == signal.side:
                await self.telegram.send(
                    f"🚨 STEAM MOVE ALERT!\n"
                    f"Sharp syndicates are hammering {steam.side} "
                    f"on {signal.event_title}\n"
                    f"Our model agrees: {signal.model_probability:.1%} "
                    f"(edge: {signal.edge:.1%})\n"
                    f"Books moved: {steam.books_count}"
                )
```

### Verification
- [ ] Simulate a steam move scenario with test data → verify detection triggers at 3+ books
- [ ] Verify Telegram alert fires correctly when steam aligns with active signal
- [ ] Historical check: do steam moves predict winners > 58% of the time?

---

## Files Created/Modified

| File | Action | Purpose |
|------|--------|---------|
| `monolith/data/line_tracker.py` | NEW | Multi-book odds snapshots |
| `monolith/analytics/clv_tracker.py` | NEW | Closing Line Value calculation |
| `monolith/analytics/sharp_detector.py` | NEW | Reverse line movement detection |
| `monolith/analytics/steam_moves.py` | NEW | Coordinated multi-book line moves |
| Database migration | NEW | `nba_odds_snapshots` + `nba_clv_log` tables |

## Dependencies
- The Odds API key (free tier: 500 req/month, $8/month for 1500)
- Phase 1 (game results for closing line comparison)
- Telegram bot (already integrated for alerts)

## API Key Setup
```bash
# Add to monolith/.env
THE_ODDS_API_KEY=your_key_here
```
Sign up at: https://the-odds-api.com/ (free tier is sufficient for NBA-only)
