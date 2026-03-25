/**
 * MLB Predictor v2 — Discord Daily Picks
 * 
 * 8-MODEL ENSEMBLE with Claude AI + Bankroll Management
 * 
 * Flow:
 *   1. Fetch schedule from MLB Stats API
 *   2. Fetch odds from The Odds API
 *   3. Run 7 math models
 *   4. Send each game to Claude with web search for real-time intel
 *   5. Blend Claude's probability as 8th model
 *   6. Calculate Kelly Criterion bet sizes
 *   7. Post top 10 picks + bet sizing to Discord
 * 
 * Secrets needed:
 *   DISCORD_WEBHOOK_URL (required)
 *   ANTHROPIC_API_KEY   (required for AI model)
 *   ODDS_API_KEY         (optional, boosts accuracy)
 */

// ═══════════════════════════════════════════════════════════════
// STATIC DATA
// ═══════════════════════════════════════════════════════════════

const TEAM_MAP = {
  108:"LAA",109:"AZ",110:"BAL",111:"BOS",112:"CHC",113:"CIN",114:"CLE",115:"COL",
  116:"DET",117:"HOU",118:"KC",119:"LAD",120:"WSH",121:"NYM",133:"ATH",134:"PIT",
  135:"SD",136:"SEA",137:"SF",138:"STL",139:"TB",140:"TEX",141:"TOR",142:"MIN",
  143:"PHI",144:"ATL",145:"CWS",146:"MIA",147:"NYY",158:"MIL"
};

const TEAMS = {
  LAD:{nm:"Los Angeles Dodgers",w:93,l:69,rpg:5.09,ra:4.22,adj:.04},
  MIL:{nm:"Milwaukee Brewers",w:97,l:65,rpg:4.98,ra:3.91,adj:-.01},
  PHI:{nm:"Philadelphia Phillies",w:96,l:66,rpg:4.80,ra:4.00,adj:-.01},
  NYY:{nm:"New York Yankees",w:94,l:68,rpg:5.24,ra:4.23,adj:-.02},
  TOR:{nm:"Toronto Blue Jays",w:94,l:68,rpg:4.93,ra:4.45,adj:-.02},
  SEA:{nm:"Seattle Mariners",w:90,l:72,rpg:4.73,ra:4.28,adj:.03},
  CHC:{nm:"Chicago Cubs",w:92,l:70,rpg:4.90,ra:4.01,adj:.01},
  SD:{nm:"San Diego Padres",w:90,l:72,rpg:4.33,ra:3.83,adj:.00},
  BOS:{nm:"Boston Red Sox",w:89,l:73,rpg:4.85,ra:4.17,adj:.00},
  CLE:{nm:"Cleveland Guardians",w:88,l:74,rpg:3.97,ra:4.01,adj:-.01},
  DET:{nm:"Detroit Tigers",w:87,l:75,rpg:4.68,ra:4.27,adj:.02},
  HOU:{nm:"Houston Astros",w:87,l:75,rpg:4.23,ra:4.10,adj:-.02},
  NYM:{nm:"New York Mets",w:83,l:79,rpg:4.73,ra:4.41,adj:.04},
  CIN:{nm:"Cincinnati Reds",w:83,l:79,rpg:4.42,ra:4.20,adj:.01},
  KC:{nm:"Kansas City Royals",w:82,l:80,rpg:4.02,ra:3.93,adj:.01},
  TEX:{nm:"Texas Rangers",w:81,l:81,rpg:4.22,ra:3.73,adj:-.01},
  SF:{nm:"San Francisco Giants",w:81,l:81,rpg:4.35,ra:4.22,adj:.03},
  AZ:{nm:"Arizona Diamondbacks",w:80,l:82,rpg:4.88,ra:4.85,adj:.00},
  MIA:{nm:"Miami Marlins",w:79,l:83,rpg:4.38,ra:4.93,adj:.00},
  STL:{nm:"St. Louis Cardinals",w:78,l:84,rpg:4.25,ra:4.65,adj:-.01},
  TB:{nm:"Tampa Bay Rays",w:77,l:85,rpg:4.41,ra:4.22,adj:-.02},
  ATL:{nm:"Atlanta Braves",w:76,l:86,rpg:4.47,ra:4.53,adj:.01},
  ATH:{nm:"Athletics",w:76,l:86,rpg:4.52,ra:5.04,adj:.02},
  BAL:{nm:"Baltimore Orioles",w:75,l:87,rpg:4.18,ra:4.86,adj:.04},
  LAA:{nm:"Los Angeles Angels",w:72,l:90,rpg:4.15,ra:5.17,adj:.00},
  PIT:{nm:"Pittsburgh Pirates",w:71,l:91,rpg:3.60,ra:3.98,adj:.04},
  MIN:{nm:"Minnesota Twins",w:70,l:92,rpg:4.19,ra:4.77,adj:-.01},
  WSH:{nm:"Washington Nationals",w:66,l:96,rpg:4.24,ra:5.55,adj:.01},
  CWS:{nm:"Chicago White Sox",w:60,l:102,rpg:3.99,ra:4.58,adj:.01},
  COL:{nm:"Colorado Rockies",w:43,l:119,rpg:3.69,ra:6.30,adj:.02},
};

const PARK_FACTORS = {
  COL:1.29,ATH:1.10,MIA:1.08,CIN:1.07,BOS:1.06,BAL:1.05,
  LAD:1.04,DET:1.04,TEX:1.03,NYY:1.02,KC:1.02,HOU:1.01,
  PHI:1.01,ATL:1.00,AZ:1.00,MIL:0.99,STL:0.98,MIN:0.98,
  CLE:0.97,PIT:0.97,WSH:0.97,TOR:0.96,LAA:0.96,CHC:0.95,
  TB:0.95,NYM:0.94,SD:0.93,SF:0.92,SEA:0.91,
};

const DIVS = {
  LAD:"NLW",SF:"NLW",SD:"NLW",AZ:"NLW",COL:"NLW",
  MIL:"NLC",CHC:"NLC",CIN:"NLC",PIT:"NLC",STL:"NLC",
  PHI:"NLE",NYM:"NLE",ATL:"NLE",MIA:"NLE",WSH:"NLE",
  NYY:"ALE",TOR:"ALE",BOS:"ALE",BAL:"ALE",TB:"ALE",
  CLE:"ALC",DET:"ALC",KC:"ALC",MIN:"ALC",CWS:"ALC",
  SEA:"ALW",HOU:"ALW",TEX:"ALW",LAA:"ALW",ATH:"ALW",
};

const MOMENTUM = {
  LAD:.6,MIL:.7,PHI:.4,NYY:.5,TOR:.5,SEA:.6,CHC:.6,SD:.5,
  BOS:.4,CLE:.7,DET:.6,HOU:.6,NYM:.5,CIN:.4,KC:.4,TEX:.6,
  SF:.7,AZ:.4,MIA:.5,STL:.4,TB:.5,ATL:.6,ATH:.5,BAL:.5,
  LAA:.4,PIT:.4,MIN:.6,WSH:.3,CWS:.3,COL:.3
};

const PITCHER_ERA_CACHE = {
  "Max Fried":2.86,"Logan Webb":3.22,"Freddy Peralta":3.48,"Paul Skenes":2.74,
  "Jacob Misiorowski":3.65,"Justin Steele":3.10,"Kyle Bradish":3.30,"Bailey Ober":4.25,
  "Framber Valdez":3.55,"Tyler Anderson":4.62,"Dylan Cease":3.40,"Tarik Skubal":2.39,
  "Nick Lodolo":3.80,"Brayan Bello":3.68,"Zack Wheeler":2.57,"Nathan Eovaldi":3.40,
  "Matthew Liberatore":4.48,"Drew Rasmussen":3.65,"Yoshinobu Yamamoto":2.95,"Zac Gallen":3.65,
  "Logan Gilbert":3.20,"Tanner Bibee":3.72,"Kevin Gausman":3.62,"Luis Severino":4.52,
  "Sandy Alcantara":3.45,"Kyle Freeland":5.80,"Chris Sale":3.15,"Seth Lugo":3.38,
  "Corbin Burnes":3.25,"Blake Snell":3.12,"Tyler Glasnow":3.32,"Gerrit Cole":3.41,
  "Shohei Ohtani":3.00,"Luis Castillo":3.48,"George Kirby":3.35,
};

// ═══════════════════════════════════════════════════════════════
// ELO
// ═══════════════════════════════════════════════════════════════
const elos = {};
Object.entries(TEAMS).forEach(([k, t]) => {
  elos[k] = 1500 + (t.w / (t.w + t.l) - 0.5) * 400;
});

// ═══════════════════════════════════════════════════════════════
// CORE MATH
// ═══════════════════════════════════════════════════════════════
const HOME_ADV = 0.038;
const PYTH_EXP = 1.83;

function pythag(rpg, ra) { return Math.pow(rpg, PYTH_EXP) / (Math.pow(rpg, PYTH_EXP) + Math.pow(ra, PYTH_EXP)); }
function log5fn(pA, pB) { return (pA - pA * pB) / (pA + pB - 2 * pA * pB); }
function clamp(v, lo = .15, hi = .85) { return Math.max(lo, Math.min(hi, v)); }
function mlToProb(ml) { return ml < 0 ? (-ml) / (-ml + 100) : 100 / (ml + 100); }
function pitcherRating(era) {
  if (!era || era <= 0) return 0.5;
  return clamp(0.5 + (4.10 - era) * 0.07, 0.35, 0.68);
}

// 8-MODEL ENSEMBLE (Claude AI gets 10% weight, redistributed from others)
const WEIGHTS_WITH_AI = { vegas:0.30, log5:0.15, elo:0.12, pitcher:0.13, park:0.05, momentum:0.05, h2h:0.05, claude:0.15 };
const WEIGHTS_NO_AI = { vegas:0.35, log5:0.20, elo:0.15, pitcher:0.15, park:0.05, momentum:0.05, h2h:0.05, claude:0 };

function mathModels(home, away, vegasHomeProb, homeSP_ERA, awaySP_ERA) {
  const hT = TEAMS[home], aT = TEAMS[away];
  if (!hT || !aT) return null;

  const hWP = (hT.w / (hT.w + hT.l)) * .6 + pythag(hT.rpg, hT.ra) * .4 + hT.adj;
  const aWP = (aT.w / (aT.w + aT.l)) * .6 + pythag(aT.rpg, aT.ra) * .4 + aT.adj;
  const mLog5 = clamp(log5fn(hWP + HOME_ADV, aWP));
  const mVegas = vegasHomeProb != null ? clamp(vegasHomeProb) : mLog5;
  const mElo = clamp(1 / (1 + Math.pow(10, ((elos[away] || 1500) - (elos[home] || 1500) - 24) / 400)));

  let mPitcher = 0.5;
  if (homeSP_ERA && awaySP_ERA) {
    mPitcher = clamp(log5fn(pitcherRating(homeSP_ERA), pitcherRating(awaySP_ERA)));
  }

  const pf = PARK_FACTORS[home] || 1.0;
  const mPark = clamp(0.5 + (pf - 1.0) * 0.5);
  const mMomentum = clamp(0.5 + ((MOMENTUM[home] || .5) - (MOMENTUM[away] || .5)) * 0.3);
  const sameDivision = DIVS[home] && DIVS[home] === DIVS[away];
  const mH2H = sameDivision ? 0.5 + (mLog5 - 0.5) * 0.8 : mLog5;

  return { vegas: mVegas, log5: mLog5, elo: mElo, pitcher: mPitcher, park: mPark, momentum: mMomentum, h2h: mH2H, hasVegas: vegasHomeProb != null };
}

function ensembleWithClaude(models, claudeHomeProb) {
  const hasClaude = claudeHomeProb != null;
  const hasVegas = models.hasVegas;
  let w = hasClaude ? { ...WEIGHTS_WITH_AI } : { ...WEIGHTS_NO_AI };

  if (!hasVegas) {
    // redistribute vegas weight
    const vw = w.vegas;
    w.log5 += vw * 0.4;
    w.elo += vw * 0.2;
    w.pitcher += vw * 0.2;
    w.claude += vw * 0.2;
    w.vegas = 0;
  }

  const mClaude = claudeHomeProb != null ? clamp(claudeHomeProb) : 0.5;

  const ensemble = clamp(
    w.vegas * models.vegas + w.log5 * models.log5 + w.elo * models.elo +
    w.pitcher * models.pitcher + w.park * models.park + w.momentum * models.momentum +
    w.h2h * models.h2h + w.claude * mClaude
  );

  return { homeWin: ensemble, awayWin: 1 - ensemble, claudeProb: mClaude, hasClaude, hasVegas };
}

// ═══════════════════════════════════════════════════════════════
// KELLY CRITERION — Half Kelly for standard risk
// ═══════════════════════════════════════════════════════════════
const BANKROLL = 100; // default, overridden by user in dashboard
const KELLY_FRACTION = 0.5; // half Kelly
const MIN_EDGE = 0.02; // minimum 2% edge to place a bet
const MAX_BET_PCT = 0.05; // never more than 5% of bankroll on one game

function kellyBet(winProb, americanOdds, bankroll = BANKROLL) {
  // Convert American odds to decimal
  let decimal;
  if (americanOdds < 0) decimal = 1 + (100 / Math.abs(americanOdds));
  else decimal = 1 + (americanOdds / 100);

  const b = decimal - 1; // net odds (profit per $1 wagered)
  const p = winProb;
  const q = 1 - p;

  // Edge = our probability minus break-even probability from odds
  const breakEven = 1 / decimal;
  const edge = p - breakEven;

  // Kelly formula: f* = (bp - q) / b
  const kelly = (b * p - q) / b;

  if (edge <= 0.01 || kelly <= 0.005) return { bet: 0, edge: edge, skip: true, reason: 'Edge too thin' };

  const halfKelly = kelly * KELLY_FRACTION;
  const betPct = Math.min(halfKelly, MAX_BET_PCT);
  const betAmount = Math.round(bankroll * betPct * 100) / 100;

  return {
    bet: betAmount,
    edge: kelly,
    pct: betPct,
    skip: false,
    units: +(betPct * 100).toFixed(2), // in "units" (% of bankroll)
  };
}

// ═══════════════════════════════════════════════════════════════
// CLAUDE AI — 8th Model + Web Search
// ═══════════════════════════════════════════════════════════════
async function askClaude(game, models, odds) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const hT = TEAMS[game.home], aT = TEAMS[game.away];
  const oddsInfo = odds
    ? `Vegas moneyline: ${game.homeName} ${odds.homeML > 0 ? '+' : ''}${odds.homeML} / ${game.awayName} ${odds.awayML > 0 ? '+' : ''}${odds.awayML} (implied: ${(odds.homeProb * 100).toFixed(1)}% home)`
    : 'No Vegas odds available';

  const prompt = `You are an expert MLB analyst. Analyze this game and return a JSON prediction.

TODAY'S MATCHUP:
${game.awayName} (${game.awaySP}) @ ${game.homeName} (${game.homeSP})

2025 SEASON STATS:
- ${game.homeName}: ${hT.w}-${hT.l}, ${hT.rpg} RPG, ${hT.ra} RA, run diff ${hT.rd > 0 ? '+' : ''}${hT.rd}
- ${game.awayName}: ${aT.w}-${aT.l}, ${aT.rpg} RPG, ${aT.ra} RA, run diff ${aT.rd > 0 ? '+' : ''}${aT.rd}

PITCHER ERAs (2025): ${game.homeSP}: ${game.homeSP_ERA || 'unknown'} / ${game.awaySP}: ${game.awaySP_ERA || 'unknown'}

PARK FACTOR: ${(PARK_FACTORS[game.home] || 1.0).toFixed(2)} (${game.home} home)

${oddsInfo}

MATH MODEL CONSENSUS: ${(models.log5 * 100).toFixed(1)}% home win (Log5), ${(models.elo * 100).toFixed(1)}% (ELO), ${(models.pitcher * 100).toFixed(1)}% (Pitcher)

INSTRUCTIONS:
1. First, search for today's latest injury reports, lineup cards, and any breaking news for both teams
2. Consider starting pitcher matchup quality, bullpen strength, recent form, and park effects
3. Factor in any narrative context (revenge games, milestones, home openers, etc.)
4. Provide your win probability for the HOME team as a number between 0.20 and 0.80
5. Provide a brief 1-2 sentence analysis

Respond ONLY with this exact JSON format, no other text:
{"home_win_prob": 0.XX, "analysis": "Your 1-2 sentence analysis here", "key_factor": "single most important factor"}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        tools: [{
          type: 'web_search_20250305',
          name: 'web_search',
        }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error('Claude API error:', res.status);
      return null;
    }

    const data = await res.json();

    // Extract text from response (may have tool use blocks)
    let fullText = '';
    for (const block of data.content) {
      if (block.type === 'text') fullText += block.text;
    }

    // Parse JSON from response
    const jsonMatch = fullText.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) { console.log('Claude returned non-JSON:', fullText.slice(0, 200)); return null; }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      homeWinProb: clamp(parsed.home_win_prob, 0.20, 0.80),
      analysis: parsed.analysis || '',
      keyFactor: parsed.key_factor || '',
    };
  } catch (e) {
    console.error('Claude analysis error:', e.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// API FETCHING
// ═══════════════════════════════════════════════════════════════
function todayStr() { return new Date().toISOString().split('T')[0]; }

async function fetchSchedule() {
  const dt = todayStr();
  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${dt}&hydrate=probablePitcher(note),team`;
  const res = await fetch(url);
  const data = await res.json();
  const games = [];
  if (data.dates) {
    for (const dateObj of data.dates) {
      for (const g of dateObj.games) {
        const home = TEAM_MAP[g.teams.home.team.id];
        const away = TEAM_MAP[g.teams.away.team.id];
        if (!home || !away || !TEAMS[home] || !TEAMS[away]) continue;
        const homeSP = g.teams.home.probablePitcher;
        const awaySP = g.teams.away.probablePitcher;
        games.push({
          id: g.gamePk, home, away,
          homeName: TEAMS[home].nm, awayName: TEAMS[away].nm,
          time: new Date(g.gameDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles' }),
          homeSP: homeSP?.fullName || 'TBD',
          awaySP: awaySP?.fullName || 'TBD',
          homeSP_ERA: PITCHER_ERA_CACHE[homeSP?.fullName] || null,
          awaySP_ERA: PITCHER_ERA_CACHE[awaySP?.fullName] || null,
        });
      }
    }
  }
  return games;
}

async function fetchOdds() {
  const key = process.env.ODDS_API_KEY;
  if (!key) return {};
  try {
    const url = `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds/?apiKey=${key}&regions=us&markets=h2h&oddsFormat=american`;
    const res = await fetch(url);
    if (!res.ok) return {};
    const data = await res.json();
    const oddsMap = {};
    for (const game of data) {
      const book = game.bookmakers?.[0];
      if (!book) continue;
      const market = book.markets?.find(m => m.key === 'h2h');
      if (!market) continue;
      let hA = null, aA = null;
      for (const [k, v] of Object.entries(TEAMS)) {
        if (game.home_team.includes(v.nm.split(' ').pop())) hA = k;
        if (game.away_team.includes(v.nm.split(' ').pop())) aA = k;
      }
      if (!hA || !aA) continue;
      const hO = market.outcomes.find(o => o.name === game.home_team);
      const aO = market.outcomes.find(o => o.name === game.away_team);
      if (!hO || !aO) continue;
      const hP = mlToProb(hO.price), aP = mlToProb(aO.price);
      oddsMap[hA + '_' + aA] = { homeProb: hP / (hP + aP), homeML: hO.price, awayML: aO.price, book: book.title };
    }
    return oddsMap;
  } catch (e) { return {}; }
}

// ═══════════════════════════════════════════════════════════════
// DISCORD MESSAGE BUILDER
// ═══════════════════════════════════════════════════════════════
function confEmoji(p) {
  const v = Math.max(p, 1 - p);
  if (v >= .68) return '🟢';
  if (v >= .58) return '🟡';
  return '⚪';
}

function buildDiscordPayload(picks, date, hasAI) {
  const top10 = picks.slice(0, 10);

  const lines = top10.map((p, i) => {
    const favHome = p.ensemble.homeWin >= 0.5;
    const fav = favHome ? p.homeName : p.awayName;
    const dog = favHome ? p.awayName : p.homeName;
    const winPct = (Math.max(p.ensemble.homeWin, p.ensemble.awayWin) * 100).toFixed(1);
    const conf = confEmoji(p.ensemble.homeWin);
    const atTag = favHome ? '(home)' : '(away)';
    const favSP = favHome ? p.homeSP : p.awaySP;
    const dogSP = favHome ? p.awaySP : p.homeSP;

    // Kelly bet sizing
    let betLine = '';
    if (p.kelly && !p.kelly.skip) {
      betLine = `\n　　💰 Suggested: **${p.kelly.units}u** ($${p.kelly.bet.toFixed(2)}) · Edge: ${(p.kelly.edge * 100).toFixed(1)}%`;
    } else {
      betLine = '\n　　💰 ⚠️ *No bet — edge too thin*';
    }

    // Claude analysis
    let aiLine = '';
    if (p.claude?.analysis) {
      aiLine = `\n　　🤖 ${p.claude.analysis}`;
    }

    return `**${i + 1}.** ${fav} ${atTag} — **${winPct}%** ${conf}\n` +
           `　　vs ${dog} · ${favSP} vs ${dogSP} · ${p.time} PT` +
           betLine + aiLine;
  });

  const modelsList = hasAI
    ? 'Vegas + Log5 + ELO + Pitcher + Park + Momentum + H2H + **Claude AI** 🤖'
    : 'Vegas + Log5 + ELO + Pitcher + Park + Momentum + H2H';

  // Summary stats
  const bettableGames = top10.filter(p => p.kelly && !p.kelly.skip);
  const totalUnits = bettableGames.reduce((s, p) => s + p.kelly.units, 0).toFixed(1);

  const embed = {
    title: `⚾ MLB Picks — ${date}`,
    description: lines.join('\n\n'),
    color: 0xF0A830,
    fields: [
      {
        name: '📊 Summary',
        value: `${bettableGames.length}/${top10.length} games bettable · ${totalUnits}u total exposure · Half Kelly sizing`,
        inline: false,
      },
    ],
    footer: {
      text: `8-Model Ensemble · ${modelsList}\n⚠️ For entertainment only — not financial advice`,
    },
    timestamp: new Date().toISOString(),
  };

  return {
    username: 'MLB Predictor',
    avatar_url: 'https://em-content.zobj.net/source/apple/391/baseball_26be.png',
    embeds: [embed],
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
async function main() {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) { console.error('❌ DISCORD_WEBHOOK_URL not set.'); process.exit(1); }

  console.log('📅 Fetching schedule...');
  const games = await fetchSchedule();
  if (games.length === 0) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'MLB Predictor', content: `⚾ No MLB games today (${todayStr()}). See you tomorrow!` }),
    });
    return;
  }
  console.log(`⚾ ${games.length} games found`);

  console.log('💰 Fetching odds...');
  const odds = await fetchOdds();
  console.log(`💰 Odds for ${Object.keys(odds).length} games`);

  console.log('🧮 Running predictions...');
  const picks = [];
  let hasAI = false;

  for (const g of games) {
    const oddsKey = g.home + '_' + g.away;
    const o = odds[oddsKey];
    const vegasProb = o ? o.homeProb : null;

    // Run 7 math models
    const models = mathModels(g.home, g.away, vegasProb, g.homeSP_ERA, g.awaySP_ERA);
    if (!models) continue;

    // Run Claude AI (8th model)
    console.log(`🤖 Analyzing: ${g.awayName} @ ${g.homeName}...`);
    const claude = await askClaude(g, models, o);
    if (claude) hasAI = true;

    // Blend ensemble
    const ensemble = ensembleWithClaude(models, claude?.homeWinProb || null);

    // Kelly bet sizing
    const favHome = ensemble.homeWin >= 0.5;
    const favProb = Math.max(ensemble.homeWin, ensemble.awayWin);
    const favOdds = favHome ? (o?.homeML || -110) : (o?.awayML || -110);
    const kelly = kellyBet(favProb, favOdds);

    picks.push({ ...g, models, claude, ensemble, kelly, odds: o });

    // Rate limit: small delay between Claude calls
    if (claude) await new Promise(r => setTimeout(r, 500));
  }

  // Sort by confidence
  picks.sort((a, b) => {
    const aC = Math.max(a.ensemble.homeWin, a.ensemble.awayWin);
    const bC = Math.max(b.ensemble.homeWin, b.ensemble.awayWin);
    return bC - aC;
  });

  console.log('📤 Posting to Discord...');
  const payload = buildDiscordPayload(picks, todayStr(), hasAI);

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    console.log(`✅ Posted ${Math.min(10, picks.length)} picks to Discord!`);
  } else {
    console.error('❌ Webhook failed:', res.status, await res.text());
    process.exit(1);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
