# ⚾ MLB Predictor v2 — 8-Model Ensemble + AI + Bankroll

Live MLB game prediction engine using a weighted ensemble of 8 independent models, including **Claude AI with real-time web search**. Ships with a web dashboard (GitHub Pages), automated Discord daily picks, and a built-in bankroll management system with Kelly Criterion bet sizing.

## Models

| # | Model | Weight | Source |
|---|-------|--------|--------|
| 1 | Vegas Odds | 30% | [The Odds API](https://the-odds-api.com) |
| 2 | Log5 / Pythagorean | 15% | 2025 final stats + 2026 adjustments |
| 3 | ELO Rating | 12% | Rolling chess-style power rating |
| 4 | Starting Pitcher | 13% | ERA-based matchup via MLB Stats API |
| 5 | Park Factor | 5% | Statcast-derived run environment |
| 6 | Momentum | 5% | Recent form (last ~10 games) |
| 7 | H2H / Division | 5% | Familiarity regression |
| 8 | **Claude AI** 🤖 | **15%** | Anthropic API + web search |

## What Claude AI Does

For each game, Claude:
- **Searches the web** for same-day injury reports, lineup cards, and breaking news
- Analyzes starting pitcher matchup quality, bullpen depth, and fatigue
- Considers narrative context (revenge games, milestones, home openers)
- Factors in weather, travel, and rest days
- Returns a calibrated win probability + written analysis

## Bankroll Management

- **Kelly Criterion** bet sizing (configurable: quarter/half/full Kelly)
- Tracks bankroll, P&L, ROI, win rate across all bets
- Shows suggested bet sizes per game based on edge & bankroll
- Min 2% edge to trigger a bet, max 5% of bankroll per game
- Log wins/losses to track performance over time

## Setup

### 1. Web Dashboard (GitHub Pages)

1. Fork or clone this repo
2. Go to **Settings → Pages → Source: Deploy from a branch → main → / (root)**
3. Dashboard live at `https://yourusername.github.io/mlb-predictor`
4. Go to **SETTINGS** tab to add your API keys

### 2. Discord Daily Picks

Automated picks with AI analysis + bet sizing posted daily at 9 AM PT.

**Create a Discord Webhook:**
1. Server Settings → Integrations → Webhooks → New Webhook
2. Copy the webhook URL

**Add GitHub Secrets** (Settings → Secrets → Actions):
| Secret | Required | Description |
|--------|----------|-------------|
| `DISCORD_WEBHOOK_URL` | ✅ Yes | Discord webhook URL |
| `ANTHROPIC_API_KEY` | ✅ Yes | Claude AI ([console.anthropic.com](https://console.anthropic.com)) |
| `ODDS_API_KEY` | Optional | Live odds ([the-odds-api.com](https://the-odds-api.com)) |

### 3. API Keys

| Service | Cost | What it does |
|---------|------|-------------|
| **Anthropic** | ~$0.01-0.03/game | Claude AI analysis with web search |
| **The Odds API** | Free (500 req/month) | Live moneylines from sportsbooks |
| **MLB Stats API** | Free (unlimited) | Scores, schedules, probable pitchers |

**Estimated cost:** ~$10-15/month during baseball season with full AI analysis on every game.

## Files

```
index.html              → Web dashboard (GitHub Pages)
discord-picks.js        → Discord bot with Claude AI + Kelly sizing
.github/workflows/
  daily-picks.yml       → Cron: 9 AM PT daily
README.md               → You are here
```

## Accuracy

| Configuration | Expected Accuracy |
|---------------|-------------------|
| Math models only | ~55-57% |
| + Vegas odds | ~57-59% |
| + Claude AI | ~58-60% |

The theoretical ceiling for single MLB game prediction is ~60% due to baseball's inherent variance.

## ⚠️ Disclaimer

This is an algorithmic experiment for entertainment purposes. It is **not financial advice**. Sports betting carries risk — never bet more than you can afford to lose.

## License

MIT
