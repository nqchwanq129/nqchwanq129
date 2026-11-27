// Transparent GitHub-themed cards and contribution activity graphs (English + Vietnamese).
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
  text: '#E6EDF3', sub: '#B1BAC4', muted: '#9198A1', accent: '#58A6FF',
  title: '#E9D7BB',
  track: '#21262D', ring: '#E9D7BB',
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

  // Fetch only the last 30 calendar days for the activity graph.
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 29);
  from.setUTCHours(0, 0, 0, 0);
  const activity = await gql(`query($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          weeks { contributionDays { date contributionCount } }
        }
      }
    }
  }`, { login: user, from: from.toISOString(), to: to.toISOString() });
  const days = activity.contributionsCollection.contributionCalendar.weeks
    .flatMap((week) => week.contributionDays)
    .filter((day) => day.date >= from.toISOString().slice(0, 10) && day.date <= to.toISOString().slice(0, 10))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!days.length) throw new Error('GitHub returned no contribution calendar days');
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
    langs, days,
  };
}

function demoData() {
  const r = (a, b) => Math.floor(a + Math.random() * (b - a));
  const names = ['TypeScript', 'JavaScript', 'Python', 'C++', 'HTML', 'CSS', 'Go', 'Shell', 'Java'];
  return {
    name: null, login: user, stars: r(5, 300), commits: r(100, 1500), prs: r(5, 120), issues: r(2, 60),
    contrib: r(1, 25), reviews: r(0, 20), followers: r(3, 200),
    langs: new Map(names.map((n) => [n, Math.round(Math.random() ** 3 * 1e6) + 1000])),
    days: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10),
      contributionCount: r(0, 18),
    })),
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
<svg xmlns="http://www.w3.org/2000/svg" width="${W - 32}" height="${H - 28}" viewBox="16 16 ${W - 32} ${H - 28}" role="img" aria-label="${esc(aria)}">
  <g font-family="${SANS}">
  <text x="24" y="38" font-size="17" font-weight="700" fill="${C.title}">${esc(title)}</text>
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
    body.push(`<circle cx="30" cy="${y - 5}" r="3" fill="${C.title}"/>`);
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

function activityGraph(lang, days) {
  const vi = lang === 'vi';
  const width = 850, height = 226;
  const left = 48, right = 826, top = 66, bottom = 204;
  const max = Math.max(1, ...days.map((day) => day.contributionCount));
  const step = Math.max(1, Math.ceil(max / 4));
  const ceiling = step * 4;
  const x = (i) => left + i * (right - left) / Math.max(1, days.length - 1);
  const y = (value) => bottom - value * (bottom - top) / ceiling;
  const total = days.reduce((sum, day) => sum + day.contributionCount, 0);
  const title = vi ? 'Hoạt động đóng góp' : 'Contribution Activity';
  const subtitle = vi ? `${total} đóng góp · ${days.length} ngày gần nhất` : `${total} contributions · Last ${days.length} days`;
  const formatDate = (date) => new Intl.DateTimeFormat(vi ? 'vi-VN' : 'en-US', {
    day: 'numeric', month: 'short', timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
  const line = days.map((day, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)},${y(day.contributionCount).toFixed(2)}`).join(' ');
  const area = `${line} L${x(days.length - 1).toFixed(2)},${bottom} L${left},${bottom} Z`;
  const body = [];
  for (let i = 0; i <= 4; i++) {
    const value = step * i, py = y(value);
    body.push(`<line x1="${left}" y1="${py}" x2="${right}" y2="${py}" stroke="${C.track}" stroke-dasharray="3 5"/>`);
    body.push(`<text x="34" y="${py + 4}" text-anchor="end" fill="${C.muted}" font-size="11">${value}</text>`);
  }
  for (const i of [...new Set([0, 7, 14, 21, days.length - 1].filter((i) => i < days.length))]) {
    body.push(`<text x="${x(i)}" y="228" text-anchor="${i === 0 ? 'start' : i === days.length - 1 ? 'end' : 'middle'}" fill="${C.muted}" font-size="11">${esc(formatDate(days[i].date))}</text>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 12 ${width} ${height}" role="img" aria-labelledby="title description">
  <title id="title">${esc(title)}</title>
  <desc id="description">${esc(subtitle)}. ${esc(days.map((day) => `${day.date}: ${day.contributionCount}`).join('; '))}</desc>
  <defs><linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.title}" stop-opacity="0.22"/><stop offset="1" stop-color="${C.title}" stop-opacity="0.01"/></linearGradient></defs>
  <g font-family="${SANS}">
    <text x="24" y="29" font-size="17" font-weight="700" fill="${C.title}">${esc(title)}</text>
    <text x="24" y="48" font-size="12" fill="${C.muted}">${esc(subtitle)}</text>
    ${body.join('\n    ')}
    <path d="${area}" fill="url(#activity-fill)"/>
    <path d="${line}" fill="none" stroke="${C.title}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
`;
}

function overviewCard(stats, languages) {
  const place = (svg, x) => svg.replace(/<\?xml[^>]*>\s*/, '')
    .replace('<svg ', `<svg x="${x}" y="4" `)
    .replace(`width="${W - 32}" height="${H - 28}"`, 'width="408" height="191"');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="850" height="200" viewBox="0 0 850 200" role="img" aria-label="GitHub statistics and most used languages">
  <style>.divider { stroke: #30363d; } @media (prefers-color-scheme: light) { .divider { stroke: #d0d7de; } }</style>
  ${place(stats, 0)}
  <line x1="425" y1="12" x2="425" y2="188" class="divider" stroke-width="1"/>
  ${place(languages, 442)}
</svg>\n`;
}

const d = demo ? demoData() : await fetchData();
const rk = rank(d);
mkdirSync(outDir, { recursive: true });
for (const lang of ['en', 'vi']) {
  const stats = statsCard(lang, d, rk);
  const languages = langsCard(lang, d);
  for (const [file, svg] of [[`stats-${lang}.svg`, stats], [`langs-${lang}.svg`, languages]]) {
    writeFileSync(join(outDir, file), svg);
    console.log(`Wrote ${join(outDir, file)}`);
  }
  writeFileSync(join(outDir, `activity-${lang}.svg`), activityGraph(lang, d.days));
  writeFileSync(join(outDir, `overview-${lang}.svg`), overviewCard(stats, languages));
}
console.log(JSON.stringify({ ...d, langs: Object.fromEntries(d.langs), rank: rk.level }));
