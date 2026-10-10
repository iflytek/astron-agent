#!/usr/bin/env node
// Record a monthly GitHub repository stargazers_count snapshot and regenerate
// docs/star-history.svg from the stored snapshots. Past points are never
// recomputed from the current stargazer cohort, so unstars do not rewrite the
// historical series.
//
// Usage:
//   GH_TOKEN=<token> node .github/scripts/gen-star-history.mjs \
//     [--repo owner/name] [--date YYYY-MM-DD] [--color '#2f7ed8'] \
//     [--data docs/star-history.json] [--out docs/star-history.svg]

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
function arg(name, def) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
}

const REPO = arg('--repo', process.env.GITHUB_REPOSITORY);
const DATE = arg('--date', new Date().toISOString().slice(0, 10));
const COLOR = arg('--color', '#2f7ed8');
const DATA = arg('--data', 'docs/star-history.json');
const OUT = arg('--out', 'docs/star-history.svg');
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

if (!REPO) { console.error('No repo: pass --repo owner/name or set GITHUB_REPOSITORY'); process.exit(1); }
if (!/^\d{4}-\d{2}-\d{2}$/.test(DATE) || !Number.isFinite(Date.parse(`${DATE}T00:00:00Z`))) {
  console.error(`Invalid snapshot date: ${DATE}`);
  process.exit(1);
}

const HEADERS = {
  'User-Agent': 'astron-star-history-snapshots',
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};
if (TOKEN) HEADERS.Authorization = `Bearer ${TOKEN}`;

async function getJson(path, tries = 6) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`https://api.github.com${path}`, { headers: HEADERS });
      if (res.ok) return res.json();
      lastErr = new Error(`${res.status} ${(await res.text()).slice(0, 160)}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise(resolve => setTimeout(resolve, 800 * (i + 1)));
  }
  throw lastErr;
}

function loadSnapshots(path, repo) {
  if (!existsSync(path)) return [];
  const parsed = JSON.parse(readFileSync(path, 'utf8'));
  if (parsed.repository !== repo || !Array.isArray(parsed.snapshots)) {
    throw new Error(`${path} must contain snapshots for ${repo}`);
  }
  const seen = new Set();
  return parsed.snapshots.map(snapshot => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshot.date)
      || !Number.isInteger(snapshot.count)
      || snapshot.count < 0
      || seen.has(snapshot.date)) {
      throw new Error(`Invalid or duplicate snapshot in ${path}: ${JSON.stringify(snapshot)}`);
    }
    seen.add(snapshot.date);
    return { date: snapshot.date, count: snapshot.count };
  });
}

function niceMax(value) {
  const v = Math.max(1, value);
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function fmtDate(timestamp) {
  const d = new Date(timestamp);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function renderSVG(snapshots, repo, color) {
  const day = 24 * 60 * 60 * 1000;
  const points = snapshots.map(({ date, count }) => [Date.parse(`${date}T00:00:00Z`), count]);
  const W = 840;
  const H = 520;
  const m = { top: 82, right: 150, bottom: 60, left: 74 };
  const plotW = W - m.left - m.right;
  const plotH = H - m.top - m.bottom;
  let tMin = points[0][0];
  let tMax = points[points.length - 1][0];
  if (tMin === tMax) {
    tMin -= 15 * day;
    tMax += 15 * day;
  }
  const yTop = niceMax(Math.max(...points.map(([, count]) => count)));
  const xOf = timestamp => m.left + ((timestamp - tMin) / (tMax - tMin)) * plotW;
  const yOf = count => m.top + plotH - (count / yTop) * plotH;
  const repoLabel = escapeXml(repo);
  const output = [];
  output.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">`);
  output.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
  output.push(`<text x="${W / 2}" y="30" text-anchor="middle" font-size="20" font-weight="600" fill="#24292f">Star History — ${repoLabel}</text>`);
  output.push(`<text x="${W / 2}" y="51" text-anchor="middle" font-size="11" fill="#57606a">Stored monthly snapshots of GitHub stargazers_count; started ${snapshots[0].date}.</text>`);
  for (let i = 0; i <= 5; i++) {
    const value = yTop * i / 5;
    const y = yOf(value);
    output.push(`<line x1="${m.left}" y1="${y.toFixed(1)}" x2="${m.left + plotW}" y2="${y.toFixed(1)}" stroke="#eaeef2"/>`);
    output.push(`<text x="${m.left - 10}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-size="12" fill="#57606a">${Math.round(value).toLocaleString()}</text>`);
  }
  for (let i = 0; i <= 6; i++) {
    const timestamp = tMin + (tMax - tMin) * i / 6;
    const x = xOf(timestamp);
    output.push(`<line x1="${x.toFixed(1)}" y1="${m.top + plotH}" x2="${x.toFixed(1)}" y2="${m.top + plotH + 5}" stroke="#8c959f"/>`);
    output.push(`<text x="${x.toFixed(1)}" y="${m.top + plotH + 22}" text-anchor="middle" font-size="12" fill="#57606a">${fmtDate(timestamp)}</text>`);
  }
  output.push(`<line x1="${m.left}" y1="${m.top}" x2="${m.left}" y2="${m.top + plotH}" stroke="#d0d7de" stroke-width="1.5"/>`);
  output.push(`<line x1="${m.left}" y1="${m.top + plotH}" x2="${m.left + plotW}" y2="${m.top + plotH}" stroke="#d0d7de" stroke-width="1.5"/>`);
  output.push(`<text transform="translate(22,${m.top + plotH / 2}) rotate(-90)" text-anchor="middle" font-size="13" fill="#57606a">GitHub Stars</text>`);
  const path = points.map(([timestamp, count], i) => `${i ? 'L' : 'M'}${xOf(timestamp).toFixed(1)},${yOf(count).toFixed(1)}`).join(' ');
  output.push(`<path d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`);
  for (const [timestamp, count] of points) {
    output.push(`<circle cx="${xOf(timestamp).toFixed(1)}" cy="${yOf(count).toFixed(1)}" r="4" fill="${color}"/>`);
  }
  const latest = snapshots[snapshots.length - 1];
  output.push(`<rect x="${m.left + plotW + 16}" y="${m.top + 6}" width="12" height="12" rx="2" fill="${color}"/>`);
  output.push(`<text x="${m.left + plotW + 32}" y="${m.top + 17}" font-size="12" fill="#24292f">${escapeXml(repo.split('/')[1])}</text>`);
  output.push(`<text x="${m.left + plotW + 32}" y="${m.top + 33}" font-size="12" font-weight="600" fill="${color}">${latest.count.toLocaleString()} ★</text>`);
  output.push('</svg>');
  return output.join('\n');
}

const metadata = await getJson(`/repos/${REPO}`);
const count = metadata.stargazers_count;
if (!Number.isInteger(count) || count < 0) {
  console.error(`Invalid stargazers_count for ${REPO}: ${count}`);
  process.exit(1);
}

const snapshots = loadSnapshots(DATA, REPO);
const existing = snapshots.find(snapshot => snapshot.date === DATE);
if (existing) existing.count = count;
else snapshots.push({ date: DATE, count });
snapshots.sort((a, b) => a.date.localeCompare(b.date));

const data = {
  repository: REPO,
  source: 'GitHub REST repository.stargazers_count monthly snapshots',
  snapshots,
};
const dataText = `${JSON.stringify(data, null, 2)}\n`;
const svgText = renderSVG(snapshots, REPO, COLOR);
writeFileSync(DATA, dataText);
writeFileSync(OUT, svgText);
console.log(`Recorded ${DATE}: ${count.toLocaleString()} stars; wrote ${DATA} and ${OUT}.`);
