## Philosophy
 
A **contrarian** gauge on a **0–100** scale:
 
- **0 = fear → opportunity** (Mr. Market is depressed, prices cheap)
- **100 = greed → danger** (Mr. Market is euphoric, prices high)
Every component is oriented so **higher = greedier**.
 
## Components (5)
 
| # | Component | Source | Rises with | Invert? |
|---|-----------|--------|-----------|---------|
| 1 | VIX | Provided in prompt `^VIX` | Fear | **Yes** |
| 2 | S&P vs 125-day MA | provided in prompt `^GSPC` | Greed | No |
| 3 | CAPE percentile | provided in prompt | Greed | No |
| 4 | Equity Risk Premium | provided in prompt | Fear | **Yes** |
| 5 | AAII Bull–Bear spread | provided in prompt | Greed | No |
 
- Component 2: `momentum = (latest_close / MA_125) − 1`
- Component 4: `ERP = (1 / trailing_PE) − ten_year_yield`
 
## Normalization
 
Only the **current** raw value is required — no rolling history lookup. Each raw value is scaled against **fixed calibration bounds** (long-run historical extremes for that component, hardcoded below), with linear min-max scaling clamped to 0–100:
 
```
score(x) = clamp((x − low) / (high − low) × 100, 0, 100)
```
 
`low` and `high` are anchored to the raw value's own historical extremes (not direction-adjusted — direction is handled in Orientation, below).
 
| Component | low anchor | high anchor | Rationale |
|---|---|---|---|
| VIX | 10 | 40 | complacent floor → sustained panic-era level (2008, 2020) |
| Momentum (S&P vs 125-day MA) | -20% | +15% | crash-era drawdown from trend → strong overbought melt-up |
| CAPE | 13 | 44 | 2009 trough → dot-com-era peak (~Dec 1999) |
| ERP | -2% | 7% | stocks priciest vs bonds → 2009-era cheapest vs bonds |
| AAII Bull–Bear spread | -50 | 50 | extreme survey bearishness → extreme survey bullishness |
 
These bounds are a fixed config, reviewed and adjusted only occasionally (e.g. if a new multi-decade extreme is set) — not recomputed per reading.
 
## Orientation
 
```
rises with GREED:  oriented_score = score
rises with FEAR:   oriented_score = 100 − score
```
 
**Test before trusting it:** a known panic date must score low, a known euphoria date high. If reversed, a component is oriented wrong.
 
## Weights
 
```
vix       0.15
momentum  0.15
cape      0.25
erp       0.25
aaii      0.20   # must sum to 1.00
```
 
## Composite & zones
 
```
composite = Σ (score × weight)
```
 
| Score | Zone | Reading |
|-------|------|---------|
| 0–20 | Deep Value | Extreme fear — hunt bargains |
| 20–40 | Fearful | Look for opportunities |
| 40–60 | Neutral | Normal |
| 60–80 | Greedy | Demand margin of safety |
| 80–100 | Euphoric | Maximum caution |
 
## Output
 
```json
{
  "as_of": "2026-07-17",
  "composite_score": 63.4,
  "zone": "Greedy",
  "reading": "Mr. Market is greedy — demand a wider margin of safety.",
  "components": [
    { "name": "VIX", "raw": 14.2, "oriented_score": 78.0, "weight": 0.15 }
  ]
}
```
 