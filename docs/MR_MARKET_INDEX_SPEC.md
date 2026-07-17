# Mr. Market Sentiment Index — v1 Spec (Simple)
 
A minimal, build-ready spec. Hand this to Claude Code to implement.
 
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
 
Convert each raw value to a 0–100 percentile against its own history:
 
```
percentile(x) = (count of past values ≤ x) / (total count) × 100
```
 
Default lookback: **10 years** (config value).
 
## Orientation
 
```
rises with GREED:  score = percentile
rises with FEAR:   score = 100 − percentile
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
    { "name": "VIX", "raw": 14.2, "percentile": 22.0, "oriented_score": 78.0, "weight": 0.15 }
  ]
}
```
 