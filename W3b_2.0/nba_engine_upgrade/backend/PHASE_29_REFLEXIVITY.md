# Phase 28: Reflexivity & Market Psychology
### *George Soros's Framework — When the Market's Belief CREATES the Reality*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Inspired by:** **George Soros** — one of the greatest traders in history ($8.6B in personal earnings). Soros's "Theory of Reflexivity" argues that markets aren't just passive reflections of reality — **participants' beliefs actively shape the outcomes.** Applied to sports: when the entire market bets on the Lakers, the perception itself affects the game through media narratives, fan energy, and even player confidence.
> **Priority:** 🟢 Medium | **Estimated Effort:** 3-4 days | **Impact:** Exploits the gap between perception and reality

---

## Overview

Every other phase assumes the betting market is a mirror — it reflects reality (imperfectly). Soros says that's wrong. The market is a **feedback loop.** The market's opinion AFFECTS the thing it's opining on.

In sports:
- When the media anoints a team as "championship favorites," that team gets more nationally televised games, more pressure, more attention from opponents' game plans
- When a team is labeled "tanking," players mentally check out — the label creates the reality
- When a line moves 2 points toward a favorite, casual bettors pile on, moving it further — creating an artificial price disconnected from true probability

These feedback loops create **mispricings** that pure statistical models miss.

---

## Step 28.1 — Public Perception Tracker

### File: `NEW → monolith/analytics/reflexivity/perception_tracker.py`

```python
class PublicPerceptionTracker:
    """
    Track the gap between public PERCEPTION and statistical REALITY.
    
    Soros's edge: When perception diverges from reality, bet reality.
    But when perception is STRONG ENOUGH, it bends reality toward perception.
    The key is knowing when perception matters and when it doesn't.
    
    Data sources:
    - Public bet % by game (from Phase 5)
    - Social media sentiment (from Phase 9)
    - National TV schedule (public exposure proxy)
    - Power rankings (ESPN, 538, etc.) vs actual performance
    """
    
    def calculate_perception_gap(self, team: str, game_date: date) -> dict:
        """
        How far has public perception diverged from statistical reality?
        """
        # Statistical reality (our model's view)
        true_strength = self.elo_model.get_rating(team)
        true_rank = self.elo_model.get_rank(team)
        
        # Public perception
        espn_power_rank = self._get_espn_power_rank(team)
        avg_public_bet_pct = self._get_avg_public_bet_pct(team, last_n=10)
        national_tv_games = self._count_national_tv_games(team, this_season=True)
        social_sentiment = self._get_social_sentiment(team)  # From Phase 9
        
        # Perception score: how much does the public "believe" in this team?
        perception_score = (
            (30 - espn_power_rank) * 2 +         # Higher rank = more perceived strength
            avg_public_bet_pct * 50 +              # More public bets = more "believed in"
            national_tv_games * 3 +                # More TV = more visibility
            social_sentiment * 20                   # Higher sentiment = more hype
        )
        
        # Reality score
        reality_score = true_strength - 1500  # Elo above/below average
        
        perception_gap = perception_score - reality_score
        
        return {
            "team": team,
            "perception_score": perception_score,
            "reality_score": reality_score,
            "perception_gap": perception_gap,
            "classification": self._classify_gap(perception_gap),
        }
    
    def _classify_gap(self, gap: float) -> str:
        if gap > 50:
            return "OVERHYPED"       # Public thinks they're better than they are → bet against
        elif gap > 20:
            return "SLIGHTLY_OVERHYPED"
        elif gap < -50:
            return "UNDERHYPED"      # Public is sleeping on them → bet for
        elif gap < -20:
            return "SLIGHTLY_UNDERHYPED"
        else:
            return "FAIRLY_PERCEIVED"
```

---

## Step 28.2 — Narrative Momentum Detector

```python
class NarrativeMomentumDetector:
    """
    Soros's reflexivity at its core: narratives ACCELERATE.
    
    Once the media decides the Lakers are "back," every win gets amplified
    and every loss gets excused. This creates a positive feedback loop:
    - More media attention → line moves toward them
    - Public piles on → line moves further
    - Actual probability: 55%. Market price: 62%.
    - Edge: bet against the narrative
    
    Conversely, once a team is labeled "in crisis" (coaching rumors, 
    losing streak), every loss confirms the narrative:
    - Negative media → line moves against them
    - Public avoids them → line moves further
    - Actual probability: 45%. Market price: 35%.
    - Edge: bet for the "crisis" team before reality reasserts
    
    CRITICAL: Reflexivity has a DECAY. Eventually reality wins.
    The edge exists in the GAP between when the narrative peaks
    and when reality catches up.
    """
    
    NARRATIVE_ARCHETYPES = {
        "comeback_kings": {
            "trigger": "3+ wins in a row after a losing streak",
            "media_effect": "Overhype: 'They've turned it around!'",
            "reality": "Regression to mean schedule difficulty likely",
            "bet_against_after": 5,  # Days until narrative is overpriced
        },
        "championship_destiny": {
            "trigger": "Team wins marquee national TV game impressively",
            "media_effect": "ESPN narrative: 'This team is built to win it all'",
            "reality": "One game doesn't change season-long quality",
            "bet_against_after": 3,
        },
        "falling_apart": {
            "trigger": "Star player has public disagreement with coach/teammates",
            "media_effect": "Team 'in crisis' — line moves 2+ points against",
            "reality": "NBA teams resolve drama quickly; performance rarely affected",
            "bet_for_after": 1,  # Bet FOR them immediately (overreaction)
        },
        "coach_on_hot_seat": {
            "trigger": "Media reports coach about to be fired",
            "media_effect": "Team given up → public fades them hard",
            "reality": "Teams often rally immediately after coaching change",
            "bet_for": "Yes, the firing game often produces effort",
        },
        "trade_deadline_hype": {
            "trigger": "Team makes blockbuster trade deadline acquisition",
            "media_effect": "'Instant contender!' → public bets them up 3+ points",
            "reality": "Trades take 10-15 games to integrate; short-term usually worse",
            "bet_against_after": 0,  # Bet against immediately
        },
    }
    
    def detect_active_narratives(self, team: str, game_date: date) -> List[dict]:
        """
        Scan for active media narratives and their betting implications.
        """
        active = []
        
        # Check social media volume spike (Phase 9 NLP)
        volume_spike = self._check_social_volume_spike(team)
        if volume_spike:
            sentiment = self._get_sentiment_direction(team)
            archetype = self._match_archetype(team, sentiment, volume_spike)
            if archetype:
                days_since_trigger = (game_date - archetype["trigger_date"]).days
                active.append({
                    "narrative": archetype["name"],
                    "days_active": days_since_trigger,
                    "expected_mispricing": archetype["media_effect"],
                    "recommended_action": self._get_action(archetype, days_since_trigger),
                })
        
        return active
```

---

## Step 28.3 — Contrarian Signal Generator

```python
class ContrarianSignal:
    """
    Soros's trading style: go AGAINST the crowd when the crowd is wrong.
    
    The Contrarian Signal fires when:
    1. Public bet % is extreme (>75% on one side)
    2. Reverse line movement (line moves opposite to public money)
    3. An active narrative is creating mispricing
    4. Our model disagrees with public consensus
    
    When ALL four align, this is a high-conviction contrarian play.
    """
    
    def generate(self, game: Game) -> dict:
        public_pct = self._get_public_bet_pct(game)
        reverse_lm = self._detect_reverse_line_movement(game)
        narrative_mispricing = self.narrative_detector.detect_active_narratives(
            game.underpriced_team, game.date
        )
        model_disagrees = abs(game.model_prob - game.market_prob) > 0.05
        
        contrarian_conditions = [
            public_pct > 0.75 or public_pct < 0.25,
            reverse_lm,
            len(narrative_mispricing) > 0,
            model_disagrees,
        ]
        
        contrarian_strength = sum(contrarian_conditions) / len(contrarian_conditions)
        
        if contrarian_strength >= 0.75:
            return {
                "signal": "STRONG_CONTRARIAN",
                "side": "against_public",
                "confidence": "HIGH",
                "reasoning": f"Public at {public_pct:.0%}, RLM detected, active narrative: "
                            f"{narrative_mispricing[0]['narrative']}, model disagrees by "
                            f"{abs(game.model_prob - game.market_prob):.1%}",
            }
```

---

## Step 28.4 — Reflexivity Decay Timer

```python
class ReflexivityDecayTimer:
    """
    Soros also knew: reflexivity doesn't last forever.
    Reality eventually reasserts.
    
    Track the lifecycle of each reflexive episode:
    1. TRIGGER (day 0): Narrative-creating event
    2. ACCELERATION (days 1-3): Media amplifies, public piles on
    3. PEAK MISPRICING (days 3-5): Maximum gap between perception and reality
    4. DECAY (days 5-10): Market slowly corrects
    5. RESOLUTION (day 10+): Price back to fair value
    
    The optimal bet window is days 2-4: after the narrative accelerates
    but before the market corrects. Betting too early = fighting momentum.
    Betting too late = edge is gone.
    """
```

---

## Why Each Trader Matters

```
THE COMPLETE QUANT LINEUP:
━━━━━━━━━━━━━━━━━━━━━━━━━

Jim Simons (Phases 1-23):  "Find the hidden patterns in the data."
Ed Thorp (Phase 24):       "Measure exactly how much you know."
D.E. Shaw (Phase 25):      "Patterns transfer across domains."
Ray Dalio (Phase 26):      "Log every decision. Learn from every mistake."
Cliff Asness (Phase 27):   "Find the persistent factors. Avoid the crowded ones."
George Soros (Phase 28):    "When the crowd is wrong, bet against them."
```

### Verification
- [ ] Perception gap should correlate with ATS (against-the-spread) performance: overhyped teams should underperform the spread
- [ ] Contrarian signals with all 4 conditions met should have ≥60% ATS win rate
- [ ] Narrative momentum should peak 3-5 days after trigger event
- [ ] Post-trade-deadline bets AGAINST the acquiring team should show positive ROI for 10 games

## Dependencies
- Public bet % data (from Phase 5)
- Social media sentiment (from Phase 9)
- ESPN power rankings (scrape, free)
- National TV schedule (ESPN API, free)
