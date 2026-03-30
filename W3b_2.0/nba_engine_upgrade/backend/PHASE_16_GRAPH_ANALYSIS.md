# Phase 15: Network & Graph Analysis
### *The NBA as a Connected Graph — Player Trades, Coaching Trees, and Hidden Relationships*

> **Parent:** [ENGINE_UPGRADE_ROADMAP.md](file:///Users/amiritate/EARN/W3B/nba_engine_upgrade/ENGINE_UPGRADE_ROADMAP.md)
> **Jim Simons Link:** RenTech analyzed relationships between correlated instruments that others treated as independent. We analyze the NBA as an interconnected network where actions on one node ripple across the graph.
> **Priority:** 🟢 Medium | **Estimated Effort:** 3-4 days | **Impact:** Discovers hidden matchup patterns and trade impact propagation

---

## Overview

The NBA isn't 30 independent teams — it's a **graph** of interconnected entities. A player trade creates an edge between two teams. A coach who was fired by Team A and hired by Team B has insider knowledge. The 2nd-year player who was mentored by a veteran on the opposing team will play differently in that matchup. Graph analysis uncovers these hidden connections.

---

## Step 15.1 — Team Connectivity Graph

### File: `NEW → monolith/models/graph/nba_graph.py`

```python
import networkx as nx

class NBAGraph:
    """
    Models the NBA as a directed, weighted graph.
    
    Nodes: Teams (30), Players (~450 active), Coaches (~30 HC + 90 assistants)
    Edges: Trades, free agent signings, coaching hires, player relationships
    
    Edge weight = recency × impact
    """
    
    def __init__(self):
        self.G = nx.DiGraph()
    
    def build_graph(self, season_data):
        """Construct the NBA relationship graph for a given season."""
        
        # Add team nodes
        for team in ALL_TEAMS:
            self.G.add_node(team, type="team")
        
        # Add player-team edges (current rosters)
        for player in season_data.players:
            self.G.add_node(player.name, type="player", bpm=player.bpm)
            self.G.add_edge(player.name, player.team, 
                          type="plays_for", weight=player.minutes_share)
        
        # Add trade edges (team-to-team knowledge transfer)
        for trade in season_data.trades:
            for player in trade.players_moved:
                self.G.add_edge(trade.from_team, trade.to_team,
                    type="trade", player=player, date=trade.date,
                    weight=self._recency_weight(trade.date))
        
        # Add coaching edges
        for coach in season_data.coaching_changes:
            self.G.add_edge(coach.old_team, coach.new_team,
                type="coaching", coach=coach.name,
                weight=self._recency_weight(coach.date))
    
    def get_familiarity_score(self, team_a: str, team_b: str) -> float:
        """
        How well does team_a know team_b's system?
        
        Based on: traded players, shared coaches, recent meetings,
        and former players now on the opposing team.
        """
        paths = nx.all_simple_paths(self.G, team_a, team_b, cutoff=2)
        familiarity = 0
        
        for path in paths:
            # Each connection adds familiarity
            for i in range(len(path) - 1):
                edge_data = self.G.get_edge_data(path[i], path[i+1])
                if edge_data:
                    if edge_data.get("type") == "trade":
                        familiarity += 3 * edge_data["weight"]
                    elif edge_data.get("type") == "coaching":
                        familiarity += 5 * edge_data["weight"]  # Coaches know playbooks
                    elif edge_data.get("type") == "former_player":
                        familiarity += 2 * edge_data["weight"]
        
        return familiarity
    
    def get_trade_impact_propagation(self, trade_event) -> dict:
        """
        When a star is traded, it doesn't just affect 2 teams.
        
        Example: Lakers trade for a star from the Suns
        - Lakers: +150 Elo (star upgrade)
        - Suns: -120 Elo (lost star)
        - Clippers: affected (same division, schedule shifts)
        - Suns' next 3 opponents: affected (weaker opponent = easier games)
        
        Graph propagation reveals these 2nd and 3rd order effects.
        """
```

---

## Step 15.2 — Coaching Tree Analysis

### File: `NEW → monolith/models/graph/coaching_tree.py`

```python
class CoachingTreeAnalyzer:
    """
    Track the "coaching tree" — who learned under whom.
    
    Key insight: Assistant coaches who become head coaches retain
    the offensive/defensive schemes of their mentor. When a student
    faces their mentor, the mentor has an edge (~58% historical win rate
    for mentor vs former assistant in first 2 seasons).
    
    After year 3+, the student has diverged enough that the edge fades.
    """
    
    NOTABLE_TREES = {
        "Gregg Popovich": ["Steve Kerr", "Mike Budenholzer", "Quin Snyder", "Becky Hammon"],
        "Pat Riley": ["Erik Spoelstra", "Stan Van Gundy"],
        "Phil Jackson": ["Steve Kerr (influenced)", "Kurt Rambis"],
    }
    
    def get_coaching_matchup_edge(self, home_coach: str, away_coach: str) -> float:
        """
        Returns Elo adjustment if there's a mentor/student relationship.
        Mentor advantage: +8 Elo (they know the student's tendencies)
        Revenge game for student: +3 Elo (extra motivation)
        """
```

---

## Step 15.3 — Player Clustering via Graph Embeddings

```python
class PlayerGraphEmbeddings:
    """
    Use Node2Vec to learn player embeddings from the team graph.
    
    Players who have played together, been traded together, or
    shared coaches are embedded close together. This discovers:
    - "System players" who perform better in specific schemes
    - Players whose styles clash despite both being individually good
    - Replacement player similarity (who can replace an injured star?)
    """
    
    def train_embeddings(self):
        """Train Node2Vec on the NBA relationship graph."""
        from node2vec import Node2Vec
        node2vec = Node2Vec(self.G, dimensions=32, walk_length=10, num_walks=200)
        model = node2vec.fit(window=5, min_count=1)
        return model
```

---

## XGBoost Features
| Feature | Description |
|---------|-------------|
| `team_familiarity_score` | Graph-based familiarity (trade/coaching connections) |
| `coaching_tree_edge` | Mentor vs student matchup adjustment |
| `player_embedding_sim` | Cosine similarity of team embeddings |

## Dependencies
- `networkx` (graph library)
- `node2vec` (graph embeddings)
- NBA transaction data (Basketball-Reference)
