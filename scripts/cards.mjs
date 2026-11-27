// Transparent GitHub-themed Stats + Top languages cards (English + Vietnamese).
// Usage: node scripts/cards.mjs <outDir> [--demo]
// Needs GITHUB_TOKEN and GH_USER (set by the workflow). --demo draws random data for a local preview.
// Everything is drawn here from the GitHub API: no third-party card service.
// Optional: HIDE_LANGS="HTML,CSS" leaves those languages out of the Top languages card.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.argv[2] || 'dist';
const demo = process.argv.includes('--demo');
const user = process.env.GH_USER || 'nqchwanq129';
const hide = new Set((process.env.HIDE_LANGS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Both cards share one size so they line up side by side in the README.
const W = 400, H = 200;
const SANS = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const C = {
  border: '#303D4B',
  text: '#E6EDF3', sub: '#B1BAC4', muted: '#9198A1', accent: '#58A6FF',
  track: '#21262D', ring: '#58A6FF',
};
// Nhóm màu tương phản cao (xanh lá, lam, tím, vàng, đỏ, teal...) để dễ phân biệt trên nền tối.
// Phần tử cuối dùng cho "Other".
const LANG_COLORS = ['#F2C14E', '#57C785', '#4FA3E3', '#A78BFA', '#E8695E', '#3FC7C7', '#DB61A2', '#8B949E'];

const T = {
  en: {
    locale: 'en-US',
    statsTitle: (n) => `${n}'s GitHub Stats`,
    stars: 'Total stars',
    commits: 'Commits (past year)',
    prs: 'Pull requests',
    issues: 'Issues',
    contrib: 'Repos contributed to',
    rank: 'Rank',
    langsTitle: 'Most used languages',
    other: 'Other',
    none: 'No public code yet',
  },
  vi: {
    locale: 'vi-VN',
    statsTitle: (n) => `Thống kê GitHub của ${n}`,
    stars: 'Tổng số sao',
    commits: 'Commit (12 tháng qua)',
    prs: 'Pull request',
    issues: 'Issue',
    contrib: 'Repo đã đóng góp',
    rank: 'Hạng',
    langsTitle: 'Ngôn ngữ dùng nhiều nhất',
    other: 'Khác',
    none: 'Chưa có code công khai',
  },
};

async function gql(query, variables) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is not set (use --demo for a local preview)');
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'coffee-cards' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  if (!json.data || !json.data.user) throw new Error(`User ${user} not found`);
  return json.data.user;
}

async function fetchData() {
  const u = await gql(`query($login: String!) {
    user(login: $login) {
      name login
      followers { totalCount }
      pullRequests { totalCount }
      issues { totalCount }
      repositoriesContributedTo(contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]) { totalCount }
      contributionsCollection { totalCommitContributions restrictedContributionsCount totalPullRequestReviewContributions }
    }
  }`, { login: user });

  // Stars and languages come from the user's own repos (forks left out), 100 at a time.
  let stars = 0, cursor = null;
  const langs = new Map();
  do {
    const r = await gql(`query($login: String!, $cursor: String) {
      user(login: $login) {
        repositories(first: 100, after: $cursor, ownerAffiliations: OWNER, isFork: false) {
          nodes { stargazerCount languages(first: 20) { edges { size node { name } } } }
          pageInfo { hasNextPage endCursor }
        }
      }
    }`, { login: user, cursor });
    for (const repo of r.repositories.nodes) {
      stars += repo.stargazerCount;
      for (const e of repo.languages.edges) langs.set(e.node.name, (langs.get(e.node.name) || 0) + e.size);
    }
    cursor = r.repositories.pageInfo.hasNextPage ? r.repositories.pageInfo.endCursor : null;
  } while (cursor);

  const cc = u.contributionsCollection;
  return {
    name: u.name, login: u.login, stars,
    // restrictedContributionsCount is the private activity GitHub lets us see (only if the profile shows it).
    commits: cc.totalCommitContributions + cc.restrictedContributionsCount,
    prs: u.pullRequests.totalCount,
    issues: u.issues.totalCount,
    contrib: u.repositoriesContributedTo.totalCount,
    reviews: cc.totalPullRequestReviewContributions,
    followers: u.followers.totalCount,
    langs,
  };
}

function demoData() {
  const r = (a, b) => Math.floor(a + Math.random() * (b - a));
  const names = ['TypeScript', 'JavaScript', 'Python', 'C++', 'HTML', 'CSS', 'Go', 'Shell', 'Java'];
  return {
    name: null, login: user, stars: r(5, 300), commits: r(100, 1500), prs: r(5, 120), issues: r(2, 60),
    contrib: r(1, 25), reviews: r(0, 20), followers: r(3, 200),
    langs: new Map(names.map((n) => [n, Math.round(Math.random() ** 3 * 1e6) + 1000])),
  };
}

// Same idea as the github-readme-stats rank, simplified: each metric is squashed to 0..1
// around a typical value, then weighted. score is 0..1 (higher is better).
function rank(d) {
  const exp = (x) => 1 - 2 ** -x;
  const logn = (x) => x / (1 + x);
  const parts = [
    [d.commits, 250, 2, exp], [d.prs, 50, 3, exp], [d.issues, 25, 1, exp],
    [d.reviews, 2, 1, exp], [d.stars, 50, 4, logn], [d.followers, 10, 1, logn],
  ];
  const totalW = parts.reduce((a, p) => a + p[2], 0);
  const score = parts.reduce((a, [v, med, w, f]) => a + w * f(v / med), 0) / totalW;
  const top = (1 - score) * 100;
  const levels = [[1, 'S'], [12.5, 'A+'], [25, 'A'], [37.5, 'A-'], [50, 'B+'], [62.5, 'B'], [75, 'B-'], [87.5, 'C+'], [100, 'C']];
  return { level: levels.find(([t]) => top <= t)[1], score };
}

function card(title, body, aria) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">
  <rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="13.25" fill="none" stroke="${C.border}" stroke-width="1.5"/>
  <g font-family="${SANS}">
  <text x="24" y="38" font-size="17" font-weight="700" fill="${C.accent}">${esc(title)}</text>
  ${body.join('\n  ')}
  </g>
</svg>
`;
}

function statsCard(lang, d, rk) {
  const t = T[lang];
  const n = (v) => v.toLocaleString(t.locale);
  const who = d.name && d.name.length <= 20 ? d.name : d.login;
  const rows = [[t.stars, d.stars], [t.commits, d.commits], [t.prs, d.prs], [t.issues, d.issues], [t.contrib, d.contrib]];
  const body = [];
  rows.forEach(([label, value], i) => {
    const y = 72 + i * 26;
    body.push(`<circle cx="30" cy="${y - 5}" r="3" fill="${C.ring}"/>`);
    body.push(`<text x="42" y="${y}" font-size="14" fill="${C.sub}">${esc(label)}</text>`);
    body.push(`<text x="262" y="${y}" text-anchor="end" font-size="14" font-weight="700" fill="${C.text}">${n(value)}</text>`);
  });
  // rank ring
  const cx = 330, cy = 112, r = 40, c = 2 * Math.PI * r;
  const f = Math.max(0.02, Math.min(1, rk.score));
  body.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.track}" stroke-width="8"/>`);
  body.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.ring}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(f * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>`);
  body.push(`<text x="${cx}" y="${cy + 9}" text-anchor="middle" font-size="26" font-weight="700" fill="${C.text}">${esc(rk.level)}</text>`);
  body.push(`<text x="${cx}" y="${cy + 64}" text-anchor="middle" font-size="12" fill="${C.muted}">${esc(t.rank)}</text>`);
  return card(t.statsTitle(who), body, t.statsTitle(who));
}

function langsCard(lang, d) {
  const t = T[lang];
  const sorted = [...d.langs].filter(([name]) => !hide.has(name.toLowerCase())).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((a, [, v]) => a + v, 0);
  const body = [];
  if (!total) {
    body.push(`<text x="${W / 2}" y="118" text-anchor="middle" font-size="14" fill="${C.muted}">${esc(t.none)}</text>`);
    return card(t.langsTitle, body, t.langsTitle);
  }
  const items = sorted.slice(0, 7).map(([name, v], i) => ({ name, v, color: LANG_COLORS[i] }));
  const rest = sorted.slice(7).reduce((a, [, v]) => a + v, 0);
  if (rest > 0) items.push({ name: t.other, v: rest, color: LANG_COLORS[7] });

  // stacked bar
  const bx = 24, by = 54, bw = W - 48, bh = 10;
  body.push(`<clipPath id="bar"><rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="5"/></clipPath>`);
  body.push(`<g clip-path="url(#bar)"><rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${C.track}"/>`);
  let x = bx;
  items.forEach((it, i) => {
    const w = i === items.length - 1 ? bx + bw - x : (it.v / total) * bw;
    body.push(`<rect x="${x.toFixed(2)}" y="${by}" width="${Math.max(0, w).toFixed(2)}" height="${bh}" fill="${it.color}"/>`);
    x += w;
  });
  body.push('</g>');

  // legend: two columns of four
  items.forEach((it, i) => {
    const lx = i < 4 ? 24 : 212, y = 94 + (i % 4) * 27;
    const pct = (it.v / total) * 100;
    const label = pct < 0.1 ? '<0.1%' : `${pct.toFixed(1)}%`;
    body.push(`<circle cx="${lx + 5}" cy="${y - 5}" r="5" fill="${it.color}"/>`);
    body.push(`<text x="${lx + 18}" y="${y}" font-size="13" fill="${C.text}">${esc(it.name)}</text>`);
    body.push(`<text x="${lx + 164}" y="${y}" text-anchor="end" font-size="12.5" font-weight="600" fill="${C.text}">${esc(label)}</text>`);
  });
  return card(t.langsTitle, body, t.langsTitle);
}

const d = demo ? demoData() : await fetchData();
const rk = rank(d);
mkdirSync(outDir, { recursive: true });
for (const lang of ['en', 'vi']) {
  for (const [file, svg] of [[`stats-${lang}.svg`, statsCard(lang, d, rk)], [`langs-${lang}.svg`, langsCard(lang, d)]]) {
    writeFileSync(join(outDir, file), svg);
    console.log(`Wrote ${join(outDir, file)}`);
  }
}
console.log(JSON.stringify({ ...d, langs: Object.fromEntries(d.langs), rank: rk.level }));
