# Phase 18: Execution Infrastructure (Multi-Book)
### *Line Shopping, Account Management, Stealth Betting, and Avoiding Limits*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Jim Simons Link:** RenTech didn't just have the best models — they had the best execution. They fragmented orders across exchanges, timed entries to minimize market impact, and never revealed their full position. We do the same across sportsbooks.
> **Priority:** 🟡 High | **Estimated Effort:** 4-5 days | **Impact:** 5-10% more edge captured through better line shopping + longer account lifespan

---

## Overview

Having the best model means nothing if you can't get your bets down. Sportsbooks aggressively limit or ban winning bettors. The execution layer manages:
- Finding the best available line across all books
- Spreading volume to avoid getting flagged
- Timing bets to seem "recreational"
- Managing multiple accounts with different risk profiles

---

## Step 18.1 — Multi-Book Line Shopper

### File: `NEW → monolith/execution/line_shopper.py`

```python
class LineShopEngine:
    """
    For any signal, find the best available line across all sportsbooks.
    
    Even a half-point better spread or slightly better moneyline adds up:
    - Getting -3 instead of -3.5 hits ~3% more often (crosses the key number 3)
    - Getting -105 instead of -110 saves ~2.2% on every bet
    - Over 500 bets per season, this is worth thousands of dollars
    """
    
    BOOKS = {
        "draftkings": {"api": "odds_api", "max_bet": 5000, "limit_risk": "high"},
        "fanduel": {"api": "odds_api", "max_bet": 5000, "limit_risk": "high"},
        "betmgm": {"api": "odds_api", "max_bet": 3000, "limit_risk": "medium"},
        "caesars": {"api": "odds_api", "max_bet": 2000, "limit_risk": "medium"},
        "pinnacle": {"api": "direct", "max_bet": 10000, "limit_risk": "low"},
        "betonline": {"api": "direct", "max_bet": 5000, "limit_risk": "low"},
        "bovada": {"api": "scrape", "max_bet": 2500, "limit_risk": "medium"},
        "kalshi": {"api": "direct", "max_bet": 25000, "limit_risk": "very_low"},
    }
    
    def find_best_line(self, signal: Signal) -> dict:
        """
        Query all active books and find the best available line.
        
        Returns the optimal book to place at, considering:
        - Best available odds
        - Account health on that book (are we close to being limited?)
        - Maximum bet allowed
        - Withdrawal ease
        """
        options = []
        for book, config in self.BOOKS.items():
            if not self._account_active(book):
                continue
            
            odds = self._get_odds(book, signal.event_id, signal.side)
            if odds is None:
                continue
            
            implied_prob = american_to_implied(odds)
            edge = signal.predicted_prob - implied_prob
            
            if edge > 0.02:  # Minimum 2% edge on this book's line
                options.append({
                    "book": book,
                    "odds": odds,
                    "implied_prob": implied_prob,
                    "edge": edge,
                    "max_bet": config["max_bet"],
                    "account_health": self._get_account_health(book),
                })
        
        if not options:
            return None
        
        # Rank by edge adjusted for account health
        return sorted(options, key=lambda x: x["edge"] * x["account_health"], reverse=True)
```

---

## Step 18.2 — Account Longevity Manager

### File: `NEW → monolith/execution/account_manager.py`

```python
class AccountLongevityManager:
    """
    Sportsbooks limit winning bettors. Strategy to stay under the radar:
    
    1. NEVER bet only sharp lines → occasionally bet popular sides
    2. Round bet amounts → $47.32 screams "algorithm", $50 looks normal
    3. Vary bet timing → don't always bet at the same time
    4. Mix in "recreational" bets → small bets on popular parlays
    5. Track account health → monitor for limit warnings
    """
    
    def camouflage_bet(self, signal: Signal) -> dict:
        """
        Transform a precise algorithmic bet into something that looks recreational.
        """
        raw_amount = signal.recommended_bet_amount
        
        # Round to nearest $5 or $10
        rounded = round(raw_amount / 5) * 5
        
        # Add small random noise (±$5)
        noisy = rounded + random.choice([-5, 0, 0, 5])
        
        # Vary timing by 0-15 minutes
        delay_minutes = random.randint(0, 15)
        
        return {
            "amount": max(10, noisy),  # Minimum $10
            "delay_minutes": delay_minutes,
            "book": signal.optimal_book,
        }
    
    def schedule_recreational_bets(self):
        """
        Place small "cover" bets on popular games to look like a recreational bettor.
        
        Rules:
        - 1-2 recreational bets per week per book
        - Always on popular games (national TV, playoffs)
        - Small amounts ($10-25)
        - Always on the public side
        - Expected loss: ~$5-15/week/book (cost of business)
        """
    
    def check_account_health(self, book: str) -> dict:
        """
        Monitor for signs that a book is about to limit us.
        
        Warning signs:
        - Maximum bet amounts suddenly reduced
        - Odds offered are worse than market average (personalized pricing)
        - Bets taking longer to be graded
        - Account verification requests increasing
        """
        return {
            "book": book,
            "health_score": self._calculate_health(book),  # 0-100
            "max_bet_current": self._get_current_max(book),
            "max_bet_original": self.BOOKS[book]["max_bet"],
            "limited": self._get_current_max(book) < self.BOOKS[book]["max_bet"] * 0.5,
            "recommendation": "diversify" if self._calculate_health(book) < 50 else "continue",
        }
```

---

## Step 18.3 — Order Fragmentation Engine

```python
class OrderFragmenter:
    """
    Split large bets across multiple books to minimize market impact
    and avoid triggering limit reviews.
    
    If the model says bet $2,000 on Lakers ML:
    - $600 on DraftKings
    - $500 on FanDuel
    - $400 on BetMGM
    - $500 on Pinnacle
    
    Stagger by 2-5 minutes to avoid coordinated-action detection.
    """
    
    def fragment(self, signal: Signal, total_amount: float) -> List[dict]:
        available_books = self.line_shopper.find_best_line(signal)
        if not available_books:
            return []
        
        fragments = []
        remaining = total_amount
        
        for book_option in available_books:
            if remaining <= 0:
                break
            
            # Max per book = 20% of their limit (stay under radar)
            max_per_book = book_option["max_bet"] * 0.20
            allocation = min(remaining, max_per_book)
            
            fragments.append({
                "book": book_option["book"],
                "amount": self._camouflage(allocation),
                "delay_seconds": random.randint(120, 300),  # 2-5 min stagger
                "odds": book_option["odds"],
            })
            remaining -= allocation
        
        return fragments
```

---

## Dependencies
- The Odds API (multi-book odds, already integrated)
- Individual sportsbook APIs / Kalshi API (already integrated)
- No new paid dependencies
