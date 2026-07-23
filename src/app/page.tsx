'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { MrMarketResult } from '@/lib/mrMarket';

type Grade = 'CATALYST-DRIVEN VALUE' | 'FAIR VALUE' | 'DEAD MONEY' | 'VALUE TRAP';
type SortKey = 'mos' | 'f';
type TabId = 'today' | 'analysis' | 'screener' | 'methodology' | 'analyze';

// Mirrors docs/ANALYSIS_ENGINE.md's Phase 3 output JSON (validated server-side by
// src/lib/validation/report.ts before it's ever stored), plus company_name, which
// the engine has no field for. Numeric-looking fields may come back as a string like
// "N/A – insufficient data" per that doc's "never guess a missing input" rule.
type Report = {
  ticker: string;
  company_name: string;
  current_price: number;
  investment_grade: Grade;
  composite_score: number;
  roic: number | string;
  wacc: number | string;
  epv_per_share: number | string;
  intrinsic_value_per_share: number | string;
  adjusted_margin_of_safety_percentage: number | string;
  piotroski_f_score: number | string;
  altman_z_score: number | string;
  red_flags: string[];
  data_gaps: string[];
  forward_looking_rationale: string;
  credible_catalyst_identified: string;
  corporate_lifecycle_stage: string;
  intangible_moat_strength: string;

  traditional_multiples: string;
  owner_earnings: number | string;
  maintenance_capex_estimate: number | string;
  sbc_dilution_flag: string;
  earnings_quality_flag: string;
  accrual_ratio: number | string;
  roiic_3yr: number | string;
  economic_profit_spread: number | string;
  capital_verdict: string;
  rule_of_40_score: number | string;
  rule_of_40_verdict: string;
  denominator_trap_risk: string;
  share_cannibal_status: string;
  per_share_growth_quality: string;
  reproduction_value_per_share: number | string;
  epv_to_rv_ratio: number | string;
  franchise_verdict: string;
  reverse_dcf_implied_growth: number | string;
  peg_ratio: number | string;
  peg_ratio_verdict: string;
  beneish_m_score: number | string;
  insider_alignment_evaluation: string;
  buyback_quality: string;
  dividend_coverage: string;
  [key: string]: unknown;
};

type MrMarket = MrMarketResult & { as_of: string };

type DisplayReport = {
  ticker: string;
  name: string;
  priceStr: string;
  ivStr: string;
  mos: number | null;
  mosStr: string;
  mosColor: string;
  spreadStr: string;
  spreadColor: string;
  fscore: number | null;
  fscoreStr: string;
  grade: Grade;
  gradeShort: string;
  gradeBg: string;
  headline: string;
  thesis: string;
};

type DetailStat = { label: string; value: string; note: string; color: string };
type DetailRow = { label: string; value: string };
type DetailView = {
  ticker: string;
  name: string;
  priceStr: string;
  grade: Grade;
  gradeBg: string;
  rationale: string;
  catalyst: string;
  lifecycle: string;
  moat: string;
  detailStats: DetailStat[];
  detailFlags: string[];
  valuationStats: DetailStat[];
  qualityStats: DetailStat[];
  qualitativeRows: DetailRow[];
  traditionalMultiples: string;
  dataGaps: string[];
};

type GaugeView = {
  gauge: number | null;
  gLabel: string;
  gColor: string;
  gCommentary: string;
  gaugeDash: string;
  gInputs: string;
};

type AppState = {
  tab: TabId;
  sel: string | null;
  requestedTicker: string | null;
  minMos: number;
  grades: Record<Grade, boolean>;
  sortKey: SortKey;
  sortDir: 1 | -1;
};

const GB: Record<Grade, string> = {
  'CATALYST-DRIVEN VALUE': '#1f6b47',
  'FAIR VALUE': '#3d5a72',
  'DEAD MONEY': '#8a6410',
  'VALUE TRAP': '#92301f',
};
const shortG: Record<Grade, string> = {
  'CATALYST-DRIVEN VALUE': 'CATALYST',
  'FAIR VALUE': 'FAIR',
  'DEAD MONEY': 'DEAD MONEY',
  'VALUE TRAP': 'TRAP',
};
const gradeOrder: Grade[] = ['CATALYST-DRIVEN VALUE', 'FAIR VALUE', 'DEAD MONEY', 'VALUE TRAP'];

const gradeDescriptions: Record<Grade, string> = {
  'CATALYST-DRIVEN VALUE':
    'Composite score ≥ 70, margin of safety ≥ 20%, a credible named catalyst, no forensic red flag, non-negative ROIIC trend.',
  'FAIR VALUE':
    'Trading rationally within its intrinsic/reproduction-value bands, or sound quality trading with margin of safety under 20%.',
  'DEAD MONEY':
    'Statistically cheap (margin of safety ≥ 20%) but weak insider alignment and zero forward-looking triggers.',
  'VALUE TRAP':
    'Low multiples masking decaying fundamentals, forensic or distress flags, misaligned incentives, and no visible turnaround catalyst.',
};

const initialState: AppState = {
  tab: 'today',
  sel: null,
  requestedTicker: null,
  minMos: 0,
  grades: { 'CATALYST-DRIVEN VALUE': true, 'FAIR VALUE': true, 'DEAD MONEY': true, 'VALUE TRAP': true },
  sortKey: 'mos',
  sortDir: -1,
};

function money(v: number): string {
  return '$' + v.toFixed(2);
}
function bigMoney(v: number): string {
  return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function numOrNull(v: number | string): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}
function fmtOrNA(v: number | string, fmt: (n: number) => string): string {
  const n = numOrNull(v);
  return n === null ? 'N/A' : fmt(n);
}
function todayStr(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function toDisplayReport(r: Report): DisplayReport {
  const mos = numOrNull(r.adjusted_margin_of_safety_percentage);
  const roic = numOrNull(r.roic);
  const wacc = numOrNull(r.wacc);
  const spread = roic !== null && wacc !== null ? +(roic - wacc).toFixed(1) : null;
  const fscore = numOrNull(r.piotroski_f_score);

  return {
    ticker: r.ticker,
    name: r.company_name,
    priceStr: money(r.current_price),
    ivStr: fmtOrNA(r.intrinsic_value_per_share, money),
    mos,
    mosStr: mos === null ? 'N/A' : (mos > 0 ? '+' : '') + mos + '%',
    mosColor: mos === null ? '#6b675c' : mos >= 20 ? '#1f6b47' : mos < 0 ? '#92301f' : '#17150f',
    spreadStr: spread === null ? 'N/A' : (spread > 0 ? '+' : '') + spread + '%',
    spreadColor: spread === null ? '#6b675c' : spread > 0 ? '#1f6b47' : '#92301f',
    fscore,
    fscoreStr: fscore === null ? 'N/A' : `${fscore}/9`,
    grade: r.investment_grade,
    gradeShort: shortG[r.investment_grade],
    gradeBg: GB[r.investment_grade],
    headline: `${r.ticker}: ${r.investment_grade}`,
    thesis: r.forward_looking_rationale,
  };
}

function computeScreenRows(
  reports: DisplayReport[],
  minMos: number,
  grades: Record<Grade, boolean>,
  sortKey: SortKey,
  sortDir: 1 | -1,
): DisplayReport[] {
  const rows = reports.filter((r) => r.mos !== null && r.mos >= minMos && grades[r.grade]);
  rows.sort((a, b) => {
    const av = (sortKey === 'mos' ? a.mos : a.fscore) ?? -Infinity;
    const bv = (sortKey === 'mos' ? b.mos : b.fscore) ?? -Infinity;
    return (av - bv) * sortDir;
  });
  return rows;
}

function computeDetail(report: Report | undefined): DetailView | null {
  if (!report) return null;
  const mos = numOrNull(report.adjusted_margin_of_safety_percentage);
  const roic = numOrNull(report.roic);
  const wacc = numOrNull(report.wacc);
  const spread = roic !== null && wacc !== null ? +(roic - wacc).toFixed(1) : null;
  const fscore = numOrNull(report.piotroski_f_score);
  const z = numOrNull(report.altman_z_score);

  const mosStr = mos === null ? 'N/A' : (mos > 0 ? '+' : '') + mos + '%';
  const mosColor = mos === null ? '#6b675c' : mos >= 20 ? '#1f6b47' : mos < 0 ? '#92301f' : '#17150f';

  const detailStats: DetailStat[] = [
    {
      label: 'Intrinsic value / share',
      value: fmtOrNA(report.intrinsic_value_per_share, money),
      note: '50% EPV · 30% DCF · 20% RV',
      color: '#17150f',
    },
    {
      label: 'Margin of safety',
      value: mosStr,
      note: mos === null ? 'Unknown' : mos >= 40 ? 'Deep value' : mos >= 20 ? 'Adequate' : mos >= 0 ? 'Thin' : 'Overvalued',
      color: mosColor,
    },
    { label: 'ROIC', value: fmtOrNA(report.roic, (n) => n.toFixed(1) + '%'), note: 'intangible-adjusted', color: '#17150f' },
    {
      label: 'ROIC − WACC',
      value: spread === null ? 'N/A' : (spread > 0 ? '+' : '') + spread + '%',
      note: spread === null ? 'Unknown' : spread > 5 ? 'Value Creator' : spread > 0 ? 'No-moat compounder' : 'Value Destroyer',
      color: spread === null ? '#6b675c' : spread > 0 ? '#1f6b47' : '#92301f',
    },
    { label: 'EPV / share', value: fmtOrNA(report.epv_per_share, money), note: 'Greenwald earnings power', color: '#17150f' },
    {
      label: 'Piotroski F-Score',
      value: fscore === null ? 'N/A' : `${fscore}/9`,
      note: fscore === null ? 'Unknown' : fscore >= 8 ? 'Financially strong' : fscore <= 2 ? 'Fundamentally weak' : 'Middling',
      color: fscore !== null && fscore <= 2 ? '#92301f' : '#17150f',
    },
    {
      label: 'Altman Z″',
      value: fmtOrNA(report.altman_z_score, (n) => n.toFixed(1)),
      note: z === null ? 'Unknown' : z > 2.6 ? 'Safe zone' : z >= 1.1 ? 'Grey zone' : 'Distress',
      color: z === null ? '#6b675c' : z > 2.6 ? '#1f6b47' : z >= 1.1 ? '#8a6410' : '#92301f',
    },
    { label: 'Composite score', value: `${report.composite_score}/100`, note: 'deterministic rubric', color: '#17150f' },
  ];

  const m = numOrNull(report.beneish_m_score);
  const forensicStats: DetailStat[] = [
    {
      label: 'Beneish M-Score',
      value: fmtOrNA(report.beneish_m_score, (n) => n.toFixed(2)),
      note: m === null ? 'Unknown' : m > -1.78 ? 'Potential manipulation' : 'No manipulation signal',
      color: m === null ? '#6b675c' : m > -1.78 ? '#92301f' : '#17150f',
    },
    {
      label: 'Accrual ratio',
      value: fmtOrNA(report.accrual_ratio, (n) => (n > 0 ? '+' : '') + (n * 100).toFixed(1) + '%'),
      note: report.earnings_quality_flag,
      color: '#17150f',
    },
  ];

  const valuationStats: DetailStat[] = [
    {
      label: 'Reproduction value / share',
      value: fmtOrNA(report.reproduction_value_per_share, money),
      note: 'asset rebuild cost',
      color: '#17150f',
    },
    {
      label: 'EPV : Reproduction value',
      value: fmtOrNA(report.epv_to_rv_ratio, (n) => n.toFixed(2) + 'x'),
      note: report.franchise_verdict,
      color: '#17150f',
    },
    {
      label: 'Reverse DCF implied growth',
      value: fmtOrNA(report.reverse_dcf_implied_growth, (n) => (n > 0 ? '+' : '') + n.toFixed(1) + '%'),
      note: 'market-implied growth rate',
      color: '#17150f',
    },
    {
      label: 'PEG ratio',
      value: fmtOrNA(report.peg_ratio, (n) => n.toFixed(2)),
      note: report.peg_ratio_verdict,
      color: '#17150f',
    },
  ];

  const qualityStats: DetailStat[] = [
    { label: 'Owner earnings', value: fmtOrNA(report.owner_earnings, bigMoney), note: 'Greenwald-adjusted', color: '#17150f' },
    {
      label: 'Maintenance capex est.',
      value: fmtOrNA(report.maintenance_capex_estimate, bigMoney),
      note: 'Greenwald split, sustaining only',
      color: '#17150f',
    },
    {
      label: 'ROIIC (3yr)',
      value: fmtOrNA(report.roiic_3yr, (n) => (n > 0 ? '+' : '') + n.toFixed(1) + '%'),
      note: 'incremental capital returns',
      color: '#17150f',
    },
    {
      label: 'Economic profit spread',
      value: fmtOrNA(report.economic_profit_spread, bigMoney),
      note: '(ROIC − WACC) × invested capital',
      color: '#17150f',
    },
    {
      label: 'Rule of 40 score',
      value: fmtOrNA(report.rule_of_40_score, (n) => n.toFixed(1)),
      note: report.rule_of_40_verdict,
      color: '#17150f',
    },
  ];

  const qualitativeRows: DetailRow[] = [
    { label: 'Capital verdict', value: report.capital_verdict },
    { label: 'Franchise verdict', value: report.franchise_verdict },
    { label: 'Denominator trap risk', value: report.denominator_trap_risk },
    { label: 'Share cannibal status', value: report.share_cannibal_status },
    { label: 'Per-share growth quality', value: report.per_share_growth_quality },
    { label: 'SBC dilution', value: report.sbc_dilution_flag },
    { label: 'Insider alignment', value: report.insider_alignment_evaluation },
    { label: 'Buyback quality', value: report.buyback_quality },
    { label: 'Dividend coverage', value: report.dividend_coverage },
  ];

  return {
    ticker: report.ticker,
    name: report.company_name,
    priceStr: money(report.current_price),
    grade: report.investment_grade,
    gradeBg: GB[report.investment_grade],
    rationale: report.forward_looking_rationale,
    catalyst: report.credible_catalyst_identified,
    lifecycle: report.corporate_lifecycle_stage,
    moat: report.intangible_moat_strength,
    detailStats: [...detailStats.slice(0, 7), ...forensicStats, detailStats[7]],
    detailFlags: report.red_flags,
    valuationStats,
    qualityStats,
    qualitativeRows,
    traditionalMultiples: report.traditional_multiples,
    dataGaps: report.data_gaps,
  };
}

const PERCENT_COMPONENTS = new Set(['S&P vs 125-day MA', 'Equity Risk Premium', 'AAII Bull-Bear Spread']);
function formatComponentRaw(name: string, raw: number): string {
  if (PERCENT_COMPONENTS.has(name)) return (raw > 0 ? '+' : '') + raw.toFixed(1) + '%';
  return raw.toFixed(1);
}

function computeGauge(mrMarket: MrMarket | null): GaugeView {
  if (mrMarket === null) {
    return {
      gauge: null,
      gLabel: 'NO DATA',
      gColor: '#6b675c',
      gCommentary: 'Sentiment index not yet connected to a data source.',
      gaugeDash: '0 251.3',
      gInputs: '',
    };
  }
  const gauge = Math.max(0, Math.min(100, mrMarket.composite_score));
  // Zones per docs/MR_MARKET_INDEX_SPEC.md: Deep Value / Fearful / Neutral / Greedy / Euphoric
  const gLabel = gauge < 20 ? 'DEEP VALUE' : gauge < 40 ? 'FEARFUL' : gauge < 60 ? 'NEUTRAL' : gauge < 80 ? 'GREEDY' : 'EUPHORIC';
  const gColor = gauge < 40 ? '#3d5a72' : gauge < 60 ? '#1f6b47' : gauge < 80 ? '#8a6410' : '#92301f';
  const gCommentary =
    gauge >= 80
      ? 'Mr. Market is euphoric — maximum caution. Graham would counsel selling him what is dear and ignoring the rest of his chatter.'
      : gauge >= 60
        ? 'Mr. Market is greedy today, offering to buy your shares at generous prices. Demand a wider margin of safety before acting on his enthusiasm.'
        : gauge >= 40
          ? 'Mr. Market is composed today — prices broadly track value. Neutral markets offer fewer gifts; this is a day for research, not action.'
          : gauge >= 20
            ? 'Mr. Market is fearful, offering to sell you his holdings at a discount. Look for opportunities where the forensic screens come back clean.'
            : 'Mr. Market is despondent — extreme fear. Historically where the best purchases are made, if the fundamentals hold up.';
  const gInputs =
    `As of ${mrMarket.as_of} (manually submitted): ` +
    mrMarket.components.map((c) => `${c.name} ${formatComponentRaw(c.name, c.raw)}`).join(' · ');
  return { gauge, gLabel, gColor, gCommentary, gaugeDash: `${((gauge / 100) * 251.3).toFixed(1)} 251.3`, gInputs };
}

export default function Page() {
  const [state, setState] = useState<AppState>(initialState);
  const [reports, setReports] = useState<Report[]>([]);
  const [mrMarket, setMrMarket] = useState<MrMarket | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/reports')
      .then((r) => r.json())
      .then(setReports)
      .catch(() => setReports([]));
    fetch('/api/mr-market')
      .then((r) => r.json())
      .then(setMrMarket)
      .catch(() => setMrMarket(null));
  }, []);

  function goTab(tab: TabId) {
    setState((s) => ({ ...s, tab }));
  }
  function goAnalysis() {
    setState((s) => ({ ...s, tab: 'analysis', sel: null }));
  }
  function goAnalysisLink(e: React.MouseEvent) {
    e.preventDefault();
    goAnalysis();
  }
  function goTodayLink(e: React.MouseEvent) {
    e.preventDefault();
    setState((s) => ({ ...s, tab: 'today' }));
  }
  function goMethodologyLink(e: React.MouseEvent) {
    e.preventDefault();
    setState((s) => ({ ...s, tab: 'methodology' }));
    window.scrollTo(0, 0);
  }
  function openReport(ticker: string) {
    setState((s) => ({ ...s, tab: 'analysis', sel: ticker }));
    window.scrollTo(0, 0);
  }
  function closeDetail() {
    setState((s) => ({ ...s, sel: null }));
  }
  function toggleGrade(g: Grade) {
    setState((s) => ({ ...s, grades: { ...s.grades, [g]: !s.grades[g] } }));
  }
  function sortBy(key: SortKey) {
    setState((s) => (s.sortKey === key ? { ...s, sortDir: (s.sortDir * -1) as 1 | -1 } : { ...s, sortKey: key, sortDir: -1 }));
  }
  function onMinMosInput(value: number) {
    setState((s) => ({ ...s, minMos: value }));
  }
  async function submitRequest(ticker: string) {
    const upper = ticker.toUpperCase();
    setRequestError(null);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: upper }),
      });
      if (!res.ok) throw new Error();
      setState((s) => ({ ...s, requestedTicker: upper }));
    } catch {
      setRequestError('Could not submit your request — please try again.');
    }
  }
  function resetAnalysis() {
    setState((s) => ({ ...s, requestedTicker: null }));
    setRequestError(null);
  }

  const displayReports = reports.map(toDisplayReport);
  const gauge = computeGauge(mrMarket);
  const detail = state.sel ? computeDetail(reports.find((r) => r.ticker === state.sel)) : null;

  return (
    <div className="page">
      <div className="wrap">
        <Header />
        <Nav tab={state.tab} goTab={goTab} />
        {state.tab === 'today' && (
          <TodayTab reports={displayReports} gauge={gauge} openReport={openReport} goAnalysisLink={goAnalysisLink} />
        )}
        {state.tab === 'analysis' && (
          <AnalysisTab reports={displayReports} detail={detail} openReport={openReport} closeDetail={closeDetail} />
        )}
        {state.tab === 'screener' && (
          <ScreenerTab
            reports={displayReports}
            minMos={state.minMos}
            grades={state.grades}
            sortKey={state.sortKey}
            sortDir={state.sortDir}
            onMinMosInput={onMinMosInput}
            toggleGrade={toggleGrade}
            sortBy={sortBy}
            openReport={openReport}
          />
        )}
        {state.tab === 'methodology' && <MethodologyTab goTodayLink={goTodayLink} />}
        {state.tab === 'analyze' && (
          <AnalyzeTab
            requestedTicker={state.requestedTicker}
            requestError={requestError}
            submitRequest={submitRequest}
            resetAnalysis={resetAnalysis}
          />
        )}
        <Footer goMethodologyLink={goMethodologyLink} />
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="site">
      <div className="brand">
        <div className="brand-name">Artificially Intelligent Investor</div>
        <div className="brand-tag">Value investing, verified by machine</div>
      </div>
      <div className="date-mono">{todayStr()}</div>
    </header>
  );
}

function Nav({ tab, goTab }: { tab: TabId; goTab: (t: TabId) => void }) {
  const items: [TabId, string][] = [
    ['today', 'Today'],
    ['analysis', 'Analysis'],
    ['screener', 'Screener'],
    ['methodology', 'Methodology'],
    ['analyze', 'Request a stock'],
  ];
  return (
    <nav className="site">
      {items.map(([id, label]) => (
        <button key={id} className={`nav-btn${tab === id ? ' active' : ''}`} onClick={() => goTab(id)}>
          {label}
        </button>
      ))}
    </nav>
  );
}

function TodayTab({
  reports,
  gauge,
  openReport,
  goAnalysisLink,
}: {
  reports: DisplayReport[];
  gauge: GaugeView;
  openReport: (t: string) => void;
  goAnalysisLink: (e: React.MouseEvent) => void;
}) {
  const latest = reports.slice(0, 4);

  return (
    <>
      <section className="today-grid" data-screen-label="Today">
        <div className="gauge-card">
          <div className="eyebrow">Mr. Market Sentiment Index</div>
          <div className="gauge-title">How is your manic partner feeling today?</div>
          <div className="gauge-center">
            <div className="gauge-svg-wrap">
              <svg width="220" height="122" viewBox="0 0 200 110">
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke="rgba(23,21,15,.12)"
                  strokeWidth={13}
                  strokeLinecap="round"
                />
                <path
                  d="M 20 100 A 80 80 0 0 1 180 100"
                  fill="none"
                  stroke={gauge.gColor}
                  strokeWidth={13}
                  strokeLinecap="round"
                  strokeDasharray={gauge.gaugeDash}
                />
              </svg>
              <div className="gauge-readout">
                <div className="gauge-value">{gauge.gauge == null ? '—' : gauge.gauge}</div>
                <div className="gauge-status" style={{ color: gauge.gColor }}>
                  {gauge.gLabel}
                </div>
              </div>
            </div>
          </div>
          <div className="gauge-scale">
            <span>0 · Deep Value</span>
            <span>50 · Neutral</span>
            <span>100 · Euphoric</span>
          </div>
          <p className="gauge-commentary">{gauge.gCommentary}</p>
          <div className="gauge-inputs">{gauge.gInputs || 'No component data available yet.'}</div>
        </div>
        <div>
          <div className="empty-state">
            <div className="empty-state-title">No commentary published yet</div>
            <div className="empty-state-text">Market commentary will appear here once content is connected.</div>
          </div>
        </div>
      </section>
      <section style={{ marginBottom: 44 }}>
        <div className="section-header">
          <h2 className="section-title">Latest grades</h2>
          <a href="#" onClick={goAnalysisLink} className="link-caps">
            All analysis →
          </a>
        </div>
        <div style={{ marginTop: 1 }}>
          {latest.length > 0 ? (
            <div className="grades-row">
              {latest.map((r) => (
                <button key={r.ticker} className="grade-card" onClick={() => openReport(r.ticker)}>
                  <div className="grade-card-top">
                    <span className="ticker-mono">{r.ticker}</span>
                    <span className="price-mono">IV {r.ivStr}</span>
                  </div>
                  <div className="grade-pill" style={{ background: r.gradeBg }}>
                    {r.grade}
                  </div>
                  <div className="thesis-text">{r.thesis}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-title">No graded companies yet</div>
              <div className="empty-state-text">Grades will appear here once the value engine has produced analysis.</div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function AnalysisTab({
  reports,
  detail,
  openReport,
  closeDetail,
}: {
  reports: DisplayReport[];
  detail: DetailView | null;
  openReport: (t: string) => void;
  closeDetail: () => void;
}) {
  if (!detail) {
    return (
      <section data-screen-label="Analysis">
        <div className="analysis-head">
          <h1 className="page-title">Analysis &amp; recommendations</h1>
          <span className="count-note">{reports.length} companies under coverage · graded by our value engine, reviewed by humans</span>
        </div>
        <p className="page-desc">
          Every grade requires a computed margin of safety, a return-on-capital verdict, a clean forensic screen, and a named
          catalyst. No exceptions — a cheap stock without a trigger is dead money, not a bargain.
        </p>
        {reports.length > 0 ? (
          <div className="reports-grid">
            {reports.map((r) => (
              <button key={r.ticker} className="report-card" onClick={() => openReport(r.ticker)}>
                <div className="report-card-top">
                  <div className="report-card-id">
                    <span className="ticker-mono" style={{ fontSize: 16 }}>
                      {r.ticker}
                    </span>
                    <span className="name-muted">{r.name}</span>
                  </div>
                  <span className="grade-pill-sm" style={{ background: r.gradeBg }}>
                    {r.grade}
                  </span>
                </div>
                <div className="report-headline">{r.headline}</div>
                <div className="report-stats">
                  <span style={{ fontWeight: 600, color: '#17150f' }}>IV {r.ivStr}</span>
                  <span style={{ color: 'var(--muted)' }}>Price {r.priceStr}</span>
                  <span style={{ color: r.mosColor }}>MoS {r.mosStr}</span>
                  <span>F-Score {r.fscoreStr}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-title">No companies under coverage yet</div>
            <div className="empty-state-text">Analysis will appear here once the value engine has graded a company.</div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section data-screen-label="Analysis">
      <button className="back-btn" onClick={closeDetail}>
        ← All analysis
      </button>
      <div className="detail-head">
        <div className="detail-id">
          <h1 className="detail-ticker">{detail.ticker}</h1>
          <span className="detail-name">{detail.name}</span>
          <span className="detail-price">{detail.priceStr}</span>
        </div>
        <span className="grade-pill-lg" style={{ background: detail.gradeBg }}>
          {detail.grade}
        </span>
      </div>
      <div className="stats-grid">
        {detail.detailStats.map((s) => (
          <div className="stat-cell" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="stat-note">{s.note}</div>
          </div>
        ))}
      </div>

      <h3 className="block-title" style={{ marginTop: 24 }}>
        Franchise &amp; valuation detail
      </h3>
      <div className="stats-grid">
        {detail.valuationStats.map((s) => (
          <div className="stat-cell" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="stat-note">{s.note}</div>
          </div>
        ))}
      </div>

      <h3 className="block-title" style={{ marginTop: 24 }}>
        Growth &amp; capital efficiency
      </h3>
      <div className="stats-grid">
        {detail.qualityStats.map((s) => (
          <div className="stat-cell" key={s.label}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="stat-note">{s.note}</div>
          </div>
        ))}
      </div>

      <div className="detail-body">
        <div>
          <h3 className="block-title">Forward-looking rationale</h3>
          <p className="rationale">{detail.rationale}</p>
          <h3 className="block-title">The realization trigger</h3>
          <div className="catalyst-box" style={{ borderLeftColor: detail.gradeBg }}>
            {detail.catalyst}
          </div>
          <h3 className="block-title" style={{ marginTop: 20 }}>
            Traditional multiples
          </h3>
          <p className="rationale" style={{ marginBottom: 0 }}>
            {detail.traditionalMultiples}
          </p>
        </div>
        <div>
          <h3 className="block-title">Red flags</h3>
          {detail.detailFlags.length > 0 ? (
            <div className="flags-list">
              {detail.detailFlags.map((f, i) => (
                <div className="flag-item" key={i}>
                  <span className="flag-marker">▪</span>
                  <span>{f}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-flags">✓ No forensic red flags. Screens clean on F-Score, Altman Z″, and Beneish M.</div>
          )}
          <h3 className="block-title">Data gaps</h3>
          {detail.dataGaps.length > 0 ? (
            <div className="flags-list">
              {detail.dataGaps.map((g, i) => (
                <div className="flag-item" key={i}>
                  <span className="flag-marker">▪</span>
                  <span>{g}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-flags">✓ No data gaps. Every input was supplied.</div>
          )}
          <h3 className="block-title">Lifecycle &amp; moat</h3>
          <div className="lifecycle-text">
            {detail.lifecycle} · Moat: {detail.moat}
          </div>
          <h3 className="block-title" style={{ marginTop: 20 }}>
            Other verdicts
          </h3>
          <div className="lifecycle-text">
            {detail.qualitativeRows.map((r) => (
              <div key={r.label} style={{ marginBottom: 6 }}>
                <strong>{r.label}:</strong> {r.value}
              </div>
            ))}
          </div>
          <div className="disclaimer">
            Not investment advice. Figures reflect the value engine&apos;s model, not a guaranteed market outcome.
          </div>
        </div>
      </div>
    </section>
  );
}

function ScreenerTab({
  reports,
  minMos,
  grades,
  sortKey,
  sortDir,
  onMinMosInput,
  toggleGrade,
  sortBy,
  openReport,
}: {
  reports: DisplayReport[];
  minMos: number;
  grades: Record<Grade, boolean>;
  sortKey: SortKey;
  sortDir: 1 | -1;
  onMinMosInput: (v: number) => void;
  toggleGrade: (g: Grade) => void;
  sortBy: (k: SortKey) => void;
  openReport: (t: string) => void;
}) {
  const rows = computeScreenRows(reports, minMos, grades, sortKey, sortDir);
  const mosSortArrow = sortKey === 'mos' ? (sortDir === -1 ? '↓' : '↑') : '';
  const fSortArrow = sortKey === 'f' ? (sortDir === -1 ? '↓' : '↑') : '';

  return (
    <section className="screener-section" data-screen-label="Screener">
      <h1 className="page-title" style={{ margin: '0 0 6px' }}>
        Margin-of-safety screener
      </h1>
      <p className="page-desc">
        Graham&apos;s central idea, computed: intrinsic value blended from earnings-power value, owner-earnings DCF, and asset
        reproduction cost. Filter our coverage by discount and quality.
      </p>
      <div className="filter-bar">
        <div className="filter-group">
          <span className="filter-label">Min. margin of safety</span>
          <input
            type="range"
            min={-20}
            max={50}
            step={5}
            value={minMos}
            onChange={(e) => onMinMosInput(parseInt(e.target.value, 10))}
            style={{ width: 150 }}
          />
          <span className="filter-value">{(minMos > 0 ? '+' : '') + minMos}%</span>
        </div>
        <div className="grade-filter-group">
          <span className="filter-label">Grade</span>
          {gradeOrder.map((g) => {
            const active = grades[g];
            return (
              <button
                key={g}
                className="grade-toggle"
                style={{
                  borderColor: active ? GB[g] : 'rgba(23,21,15,.25)',
                  background: active ? GB[g] : 'transparent',
                  color: active ? '#fdfcf9' : '#6b675c',
                }}
                onClick={() => toggleGrade(g)}
              >
                {shortG[g]}
              </button>
            );
          })}
        </div>
        <div className="match-count">
          {rows.length} of {reports.length} match
        </div>
      </div>
      <table className="screener">
        <thead>
          <tr>
            <th>Company</th>
            <th className="th-right">Price</th>
            <th className="th-right">Intrinsic value</th>
            <th className="th-right">
              <button className="sort-btn" onClick={() => sortBy('mos')}>
                Margin of safety {mosSortArrow}
              </button>
            </th>
            <th className="th-right">
              <button className="sort-btn" onClick={() => sortBy('f')}>
                F-Score {fSortArrow}
              </button>
            </th>
            <th className="th-right">ROIC − WACC</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr className="empty-row">
              <td colSpan={7}>{reports.length === 0 ? 'No companies under coverage yet.' : 'No companies match the current filters.'}</td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr className="table-row" key={r.ticker} onClick={() => openReport(r.ticker)}>
                <td>
                  <span className="ticker-mono">{r.ticker}</span>{' '}
                  <span className="name-muted" style={{ marginLeft: 8 }}>
                    {r.name}
                  </span>
                </td>
                <td className="td-right">{r.priceStr}</td>
                <td className="td-right">{r.ivStr}</td>
                <td className="td-right" style={{ fontWeight: 500, color: r.mosColor }}>
                  {r.mosStr}
                </td>
                <td className="td-right">{r.fscoreStr}</td>
                <td className="td-right" style={{ color: r.spreadColor }}>
                  {r.spreadStr}
                </td>
                <td>
                  <span className="grade-pill-sm" style={{ background: r.gradeBg, whiteSpace: 'nowrap' }}>
                    {r.gradeShort}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="footnote">
        Click any row for the full report. Not investment advice — figures come from manually-computed analysis, not live market
        data.
      </div>
    </section>
  );
}

function MethodologyTab({ goTodayLink }: { goTodayLink: (e: React.MouseEvent) => void }) {
  return (
    <section className="screener-section" data-screen-label="Methodology">
      <h1 className="page-title" style={{ margin: '0 0 6px' }}>
        Methodology
      </h1>
      <p className="page-desc" style={{ margin: '0 0 26px' }}>
        Every grade and every sentiment reading on this site comes from a deterministic rubric, not a vibe. This page is the full
        recipe for both.
      </p>

      <h2 className="method-section-title">How a stock earns its grade</h2>
      <p className="rationale">
        Grades come from a value-investing engine that corrects GAAP distortions, prices the business three independent ways, runs
        it through forensic fraud and distress screens, and refuses to reward &quot;cheap&quot; without a reason it stops being
        cheap.
      </p>
      <div className="method-grid">
        <div className="method-card">
          <h3 className="method-title">Owner earnings, not reported income</h3>
          <p className="method-excerpt">
            Net income is adjusted for R&amp;D, SaaS development, and brand spend, and total capex is split into maintenance vs.
            growth. Only maintenance capex is subtracted, so earnings reflect true cash-generating power, not accounting noise.
          </p>
        </div>
        <div className="method-card">
          <h3 className="method-title">Return on capital vs. cost of capital</h3>
          <p className="method-excerpt">
            ROIC is computed on an intangible-adjusted basis and compared to WACC. A rising spread marks a Value Creator; a spread
            near zero is a No-Moat Compounder; a negative spread is a Value Destroyer — growth that actively destroys value.
          </p>
        </div>
        <div className="method-card">
          <h3 className="method-title">Intrinsic value, three ways</h3>
          <p className="method-excerpt">
            Earnings Power Value (a no-growth perpetuity), a conservative two-stage owner-earnings DCF, and asset reproduction
            value are blended 50/30/20 into one intrinsic value per share. Margin of safety is the computed discount to price —
            never asserted.
          </p>
        </div>
        <div className="method-card">
          <h3 className="method-title">Forensic screens, before anything else</h3>
          <p className="method-excerpt">
            The Piotroski F-Score (financial strength), Altman Z″-Score (distress risk), and Beneish M-Score
            (earnings-manipulation risk) run on every name. A red flag here can override an otherwise cheap valuation entirely.
          </p>
        </div>
        <div className="method-card">
          <h3 className="method-title">The realization trigger</h3>
          <p className="method-excerpt">
            A stock can be cheap and high quality and still go nowhere for years. No positive grade is issued without a named,
            dated catalyst — an activist, a spinoff, a new CEO, a closing valuation gap, or a demand inflection already visible in
            bookings or guidance.
          </p>
        </div>
        <div className="method-card">
          <h3 className="method-title">Capital allocation &amp; incentives</h3>
          <p className="method-excerpt">
            Insider ownership, buyback quality (value-accretive only below intrinsic value), and whether executive pay is tied to
            ROIC or free cash flow rather than size, all factor into the final score.
          </p>
        </div>
      </div>

      <h3 className="block-title" style={{ marginTop: 24 }}>
        Composite score &amp; grade mapping
      </h3>
      <p className="excerpt" style={{ marginBottom: 14 }}>
        The dimensions above are weighted into one 0–100 composite score. Forensic red flags, or a negative return-on-capital
        spread with no catalyst, override the score outright and cap the grade regardless of how cheap the stock looks.
      </p>
      <table style={{ marginBottom: 18 }}>
        <thead>
          <tr>
            <th>Dimension</th>
            <th className="th-right">Weight</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Margin of safety</td>
            <td className="td-right">25</td>
          </tr>
          <tr>
            <td>Return on capital</td>
            <td className="td-right">20</td>
          </tr>
          <tr>
            <td>Earnings quality &amp; forensics</td>
            <td className="td-right">15</td>
          </tr>
          <tr>
            <td>Moat strength</td>
            <td className="td-right">15</td>
          </tr>
          <tr>
            <td>Capital allocation &amp; alignment</td>
            <td className="td-right">15</td>
          </tr>
          <tr>
            <td>Catalyst</td>
            <td className="td-right">10</td>
          </tr>
        </tbody>
      </table>
      <table style={{ marginBottom: 44 }}>
        <thead>
          <tr>
            <th>Grade</th>
            <th>Requires</th>
          </tr>
        </thead>
        <tbody>
          {gradeOrder.map((g) => (
            <tr key={g}>
              <td style={{ whiteSpace: 'nowrap' }}>
                <span className="grade-pill-sm" style={{ background: GB[g] }}>
                  {shortG[g]}
                </span>{' '}
                <span className="name-muted" style={{ marginLeft: 8 }}>
                  {g}
                </span>
              </td>
              <td style={{ fontFamily: 'var(--sans)', lineHeight: 1.5 }}>{gradeDescriptions[g]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="method-section-title">The Mr. Market Sentiment Index</h2>
      <p className="rationale">
        A contrarian, market-wide gauge on a 0–100 scale — 0 means Mr. Market is fearful and prices are cheap (opportunity), 100
        means he&apos;s euphoric and prices are stretched (danger). It says nothing about any one stock; it&apos;s the temperature
        of the whole market, read on the{' '}
        <a href="#" onClick={goTodayLink}>
          Today tab
        </a>
        .
      </p>
      <table style={{ marginBottom: 18 }}>
        <thead>
          <tr>
            <th>Component</th>
            <th>Rises with</th>
            <th className="th-right">Weight</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>VIX</td>
            <td>Fear</td>
            <td className="td-right">15%</td>
          </tr>
          <tr>
            <td>S&amp;P 500 vs. 125-day moving average</td>
            <td>Greed</td>
            <td className="td-right">15%</td>
          </tr>
          <tr>
            <td>CAPE</td>
            <td>Greed</td>
            <td className="td-right">25%</td>
          </tr>
          <tr>
            <td>Equity risk premium</td>
            <td>Fear</td>
            <td className="td-right">25%</td>
          </tr>
          <tr>
            <td>AAII bull–bear spread</td>
            <td>Greed</td>
            <td className="td-right">20%</td>
          </tr>
        </tbody>
      </table>
      <p className="excerpt" style={{ marginBottom: 18 }}>
        Each raw reading is scaled against fixed calibration bounds — long-run historical extremes for that component — so only
        today&apos;s reading is ever needed, no rolling history lookup. The scaled value is then oriented so higher always means
        greedier — the two components that rise with fear (VIX, equity risk premium) are inverted first. The five oriented scores
        are then combined using the weights above into one composite reading.
      </p>
      <table style={{ marginBottom: 20 }}>
        <thead>
          <tr>
            <th>Score</th>
            <th>Zone</th>
            <th>Reading</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>0–20</td>
            <td>Deep Value</td>
            <td style={{ fontFamily: 'var(--sans)' }}>Extreme fear — hunt bargains</td>
          </tr>
          <tr>
            <td>20–40</td>
            <td>Fearful</td>
            <td style={{ fontFamily: 'var(--sans)' }}>Look for opportunities</td>
          </tr>
          <tr>
            <td>40–60</td>
            <td>Neutral</td>
            <td style={{ fontFamily: 'var(--sans)' }}>Normal</td>
          </tr>
          <tr>
            <td>60–80</td>
            <td>Greedy</td>
            <td style={{ fontFamily: 'var(--sans)' }}>Demand a wider margin of safety</td>
          </tr>
          <tr>
            <td>80–100</td>
            <td>Euphoric</td>
            <td style={{ fontFamily: 'var(--sans)' }}>Maximum caution</td>
          </tr>
        </tbody>
      </table>
      <div className="disclaimer">
        Grades and sentiment readings are produced by an AI model against this rubric and reviewed by a human before publication.
        Nothing on this page or this site is investment advice.
      </div>
    </section>
  );
}

function AnalyzeTab({
  requestedTicker,
  requestError,
  submitRequest,
  resetAnalysis,
}: {
  requestedTicker: string | null;
  requestError: string | null;
  submitRequest: (t: string) => Promise<void>;
  resetAnalysis: () => void;
}) {
  const [tickerInput, setTickerInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const recentRequests: string[] = [];

  async function handleSubmit() {
    const ticker = tickerInput.trim();
    if (!ticker || submitting) return;
    setSubmitting(true);
    try {
      await submitRequest(ticker);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="screener-section" data-screen-label="Request a stock">
      <div className="analyze-head">
        <h1 className="page-title">Request a stock</h1>
        <span className="soon-badge">LIVE ANALYSIS COMING SOON</span>
      </div>
      <p className="page-desc" style={{ margin: '0 0 26px' }}>
        Live analysis is on its way. For now, tell us which company to prioritize and we&apos;ll notify you the moment its full
        report — intrinsic value, forensic screens, and grade — is ready.
      </p>
      <div className="analyze-grid">
        <div className="analyze-card">
          {requestedTicker ? (
            <>
              <div className="req-received">✓ REQUEST RECEIVED</div>
              <div className="req-title">{requestedTicker} is on the list.</div>
              <p className="req-desc">
                Live analysis isn&apos;t switched on yet — we&apos;re finishing the value engine that computes owner earnings,
                intrinsic value, and the forensic screens for every request. You&apos;ll be notified as soon as {requestedTicker}
                &apos;s report is ready.
              </p>
              <button
                className="btn-outline"
                onClick={() => {
                  setTickerInput('');
                  resetAnalysis();
                }}
              >
                Request another
              </button>
            </>
          ) : (
            <>
              <label className="field-label">Ticker or company name</label>
              <input
                className="field"
                placeholder="e.g. NKE or Nike Inc."
                value={tickerInput}
                onChange={(e) => setTickerInput(e.target.value)}
              />
              <div className="field-note">
                Our engine never approximates a missing input to force a score — if margin of safety, return on capital, or the
                forensic screens can&apos;t be computed, the grade is capped and the gaps are listed.
              </div>
              {requestError && (
                <div className="flag-item" style={{ marginBottom: 12 }}>
                  ▪ {requestError}
                </div>
              )}
              <button className="btn-dark" onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit request →'}
              </button>
            </>
          )}
        </div>
        <div>
          <div className="includes-box">
            <div className="includes-title">Every report will include</div>
            <div className="includes-list">
              <div>Intrinsic value per share &amp; margin of safety</div>
              <div>ROIC − WACC verdict: creator, compounder, or destroyer</div>
              <div>Piotroski F-Score · Altman Z″ · Beneish M-Score</div>
              <div>Named catalyst — or an honest &quot;none identified&quot;</div>
              <div>Final grade, from CATALYST-DRIVEN VALUE to VALUE TRAP</div>
            </div>
          </div>
          <div className="recent-box">
            <div className="recent-title">Recently requested</div>
            <div className="tag-list">
              {recentRequests.length > 0 ? (
                recentRequests.map((t) => (
                  <span className="tag" key={t}>
                    {t}
                  </span>
                ))
              ) : (
                <span className="empty-state-text">No requests yet.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer({ goMethodologyLink }: { goMethodologyLink: (e: React.MouseEvent) => void }) {
  return (
    <footer className="site">
      <div className="footer-copy">
        © {new Date().getFullYear()} ArtificiallyIntelligentInvestor.com · Analysis generated by AI, reviewed by humans · Nothing
        here is investment advice.
      </div>
      <div className="footer-links">
        <a href="#">YouTube</a>
        <a href="#">X</a>
        <a href="#">LinkedIn</a>
        <a href="#" onClick={goMethodologyLink}>
          Methodology
        </a>
        <Link href="/contact">Contact</Link>
      </div>
    </footer>
  );
}
