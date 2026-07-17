# ArtificiallyIntelligentInvestor — Project Map

This file orients Claude Code when working in this repo. It is the **map**, not the analysis logic. The stock-analysis framework lives in `ANALYSIS_ENGINE.md` and the sentiment-index logic in `docs/MR_MARKET_INDEX_SPEC.md` — reference those, don't duplicate or re-implement them here or in code.

## What this project is

An AI-powered value-investing platform with two analytical surfaces:

- **Per-stock analysis** — a user enters a ticker and gets a structured verdict: **CATALYST-DRIVEN VALUE / FAIR VALUE / DEAD MONEY / VALUE TRAP**.
- **Mr. Market Sentiment Index** — a market-wide contrarian gauge of how fearful or greedy the market is right now.

## Stack

- **Next.js** (App Router) — frontend + API routes (backend lives in the same project)
- **Vercel** — hosting
- **Supabase** (Postgres) — database: cached reports and index values, user data later
- **Financial Modeling Prep (FMP)** — financial + market data
- **Anthropic API (Claude)** — runs the analysis engine

## Key files

| File | Role |
| --- | --- |
| `ANALYSIS_ENGINE.md` | The value-investing system prompt sent to Claude at runtime to analyze one stock. Defines the JSON output schema. |
| `docs/MR_MARKET_INDEX_SPEC.md` | Full spec for the Mr. Market Sentiment Index — components, normalization, weights, zones, output schema. |
| `dashboard.html` | Current render surface for a single report. |
| `AI Investor Site.html` | Current work in progress website. |

## The stock analysis engine

A user submits a ticker; the app pulls the financials the engine needs from FMP, assembles them into the data dump the engine expects, and calls Claude with `ANALYSIS_ENGINE.md` as the system prompt. The engine returns a JSON verdict (schema defined in that file), which is cached in Supabase and rendered. All valuation logic — owner earnings, ROIC, intrinsic value, forensic screens, scoring — lives in `ANALYSIS_ENGINE.md`.

## The Mr. Market Sentiment Index

A contrarian, market-wide gauge on a 0–100 scale: **0 = fear → opportunity**, **100 = greed → danger**. It blends valuation and sentiment signals with a value tilt.

Each component — e.g. VIX, the S&P 500 vs its 125-day moving average, CAPE percentile, the equity risk premium, and the AAII bull–bear spread — is normalized to a 0–100 percentile against its own history, oriented so that **higher always means greedier**, then weighted and combined into a composite score and a zone (Deep Value → Fearful → Neutral → Greedy → Euphoric). It is computed periodically and cached, separate from the per-stock engine. Full logic — components, orientation, weights, formula, and output schema — lives in `docs/MR_MARKET_INDEX_SPEC.md`.

## Conventions for the agent

- **Analysis logic has one home each.** Stock logic lives only in `ANALYSIS_ENGINE.md`; index logic only in `docs/MR_MARKET_INDEX_SPEC.md`. Don't paraphrase or re-implement their formulas elsewhere — load and reference the files.
- **Never hardcode secrets.** API keys go in `.env.local` locally and Vercel environment variables in production.
- **Content as MDX** files in the repo, not a CMS.
- Every user-facing report or index reading must carry a **"not financial advice"** disclaimer.