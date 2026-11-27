// Generate self-contained project cards. Run: node scripts/projects.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = join(root, 'assets/projects');
mkdirSync(destination, { recursive: true });
const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function icon(name, x, y) {
  return readFileSync(join(root, `assets/skill-icons/${name}.svg`), 'utf8')
    .replace(/<svg\b[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" x="${x}" y="${y}" width="27" height="27" viewBox="0 0 256 256">`);
}

const projects = [
  {
    file: 'profile', label: 'PERSONAL PROFILE', title: 'nqchwanq129',
    description: ['A cozy corner of GitHub, built around coffee,', 'code, and curiosity. Custom SVG illustrations', 'and automatically updated activity cards.'],
    accent: '#c9a77b', tint: '#211e1b', icons: ['javascript', 'github'],
    stack: 'JavaScript · GitHub Actions',
    art: `
      <path d="M25 30 H64 M44 11 V49 M397 95 H431 M414 78 V112" stroke="#c9a77b" stroke-opacity=".15" stroke-width="1.5"/>
      <rect x="83" y="20" width="294" height="105" rx="10" fill="#0d1117" stroke="#c9a77b" stroke-opacity=".3"/>
      <path d="M84 43 H376" stroke="#30363d"/>
      <circle cx="99" cy="32" r="3" fill="#d88b82"/>
      <circle cx="111" cy="32" r="3" fill="#d6b77a"/>
      <circle cx="123" cy="32" r="3" fill="#88b89c"/>
      <g font-family="Consolas, monospace" font-size="12">
        <text x="101" y="67" fill="#c9a77b">~ hello, i'm hoang.</text>
        <text x="101" y="88" fill="#9198a1">&gt; brew coffee</text>
        <text x="101" y="108" fill="#9198a1">&gt; build something</text>
      </g>
      <g transform="translate(318 65)">
        <path d="M15 13 C36 6 38 35 17 33" fill="none" stroke="#c9a77b" stroke-width="4"/>
        <path d="M-18 10 H20 L17 33 Q0 45 -15 33 Z" fill="#e9d7bb"/>
        <ellipse cy="10" rx="19" ry="5" fill="#9a6b43"/>
        <path d="M-5 -2 C-14 -10 3 -13 -3 -21 M8 -4 C0 -12 17 -15 11 -23" fill="none" stroke="#c9a77b" stroke-width="2" stroke-linecap="round"/>
      </g>`,
  },
  {
    file: 'orbcomm', label: 'WEB APPLICATION', title: 'ORBCOMM Location Tracking',
    description: ['Device locations, journey history, and remote', 'commands in one dashboard. Built for', 'exploring ORBCOMM tracking data on a map.'],
    accent: '#58a6ff', tint: '#121f30', icons: ['csharp', 'dotnet', 'javascript', 'sqlserver'],
    stack: 'ASP.NET Core 8 · MapLibre',
    art: `
      <g stroke="#58a6ff" stroke-opacity=".08">
        <path d="M0 32 H460 M0 64 H460 M0 96 H460 M0 128 H460"/>
        <path d="M38 0 V138 M102 0 V138 M166 0 V138 M230 0 V138 M294 0 V138 M358 0 V138 M422 0 V138"/>
      </g>
      <path d="M152 -4 L208 35 L181 80 L236 143 M264 -8 L289 48 L351 75 L390 145 M125 112 L222 98 L288 114 L465 65" fill="none" stroke="#385573" stroke-width="7" stroke-opacity=".45"/>
      <path d="M152 -4 L208 35 L181 80 L236 143 M264 -8 L289 48 L351 75 L390 145 M125 112 L222 98 L288 114 L465 65" fill="none" stroke="#7893ad" stroke-width="1" stroke-opacity=".4"/>
      <path d="M191 102 L223 84 L257 91 L286 57 L338 49" fill="none" stroke="#58a6ff" stroke-width="11" stroke-opacity=".12" stroke-linecap="round"/>
      <path d="M191 102 L223 84 L257 91 L286 57 L338 49" fill="none" stroke="#58a6ff" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="191" cy="102" r="5" fill="#0d1117" stroke="#58a6ff" stroke-width="2"/>
      <circle cx="338" cy="49" r="17" fill="#58a6ff" fill-opacity=".13"/>
      <path d="M338 27 C322 27 322 45 338 57 C354 45 354 27 338 27Z" fill="#58a6ff"/>
      <circle cx="338" cy="38" r="4" fill="#0d1117"/>
      <rect x="27" y="23" width="112" height="93" rx="9" fill="#0d1117" stroke="#385573"/>
      <rect x="40" y="38" width="48" height="5" rx="2.5" fill="#58a6ff" opacity=".8"/>
      <g fill="#303d4b"><rect x="40" y="55" width="83" height="4" rx="2"/><rect x="40" y="66" width="63" height="4" rx="2"/><rect x="40" y="90" width="68" height="4" rx="2"/></g>
      <circle cx="44" cy="80" r="3" fill="#57c785"/>
      <path d="M53 80 H103" stroke="#7893ad" stroke-width="3" stroke-linecap="round"/>`,
  },
];

const vietnamese = {
  profile: {
    label: 'HỒ SƠ CÁ NHÂN',
    description: ['Không gian GitHub với cà phê và những', 'ý tưởng mới. Minh họa SVG cùng biểu đồ', 'hoạt động được cập nhật tự động.'],
  },
  orbcomm: {
    label: 'ỨNG DỤNG WEB',
    description: ['Theo dõi vị trí thiết bị, xem lại hành trình', 'và gửi lệnh từ một bảng điều khiển.', 'Tích hợp bản đồ và dữ liệu ORBCOMM.'],
  },
};

for (const lang of ['en', 'vi']) {
for (const original of projects) {
  const project = lang === 'vi' ? { ...original, ...vietnamese[original.file] } : original;
  const sourceLabel = lang === 'vi' ? 'Mã nguồn ↗' : 'Source Code ↗';
  const lines = project.description.map((text, i) => `<text x="24" y="${225 + i * 19}" class="muted" font-size="13.5">${escape(text)}</text>`).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="354" viewBox="0 0 460 354" role="img" aria-labelledby="title description">
  <title id="title">${escape(project.title)}</title>
  <desc id="description">${escape(project.description.join(' '))} ${escape(project.stack)}. Open the source repository.</desc>
  <style>
    .surface { fill: #0d1117; } .border { stroke: #30363d; } .heading { fill: #e6edf3; } .muted { fill: #9198a1; }
    @media (prefers-color-scheme: light) {
      .surface { fill: #ffffff; } .border { stroke: #d0d7de; } .heading { fill: #1f2328; } .muted { fill: #59636e; }
    }
  </style>
  <defs><clipPath id="hero"><path d="M19 1 H441 Q459 1 459 19 V138 H1 V19 Q1 1 19 1Z"/></clipPath></defs>
  <rect x=".75" y=".75" width="458.5" height="352.5" rx="18" class="surface border" stroke-width="1.5"/>
  <g clip-path="url(#hero)"><rect width="460" height="138" fill="${project.tint}"/>${project.art}</g>
  <g font-family="'Segoe UI', Arial, sans-serif">
    <text x="24" y="166" fill="${project.accent}" font-size="10" font-weight="700" letter-spacing="2">${project.label}</text>
    <text x="432" y="167" text-anchor="end" fill="${project.accent}" font-size="21">↗</text>
    <text x="24" y="198" class="heading" font-size="22" font-weight="700">${escape(project.title)}</text>
    ${lines}
    ${project.icons.map((name, i) => icon(name, 24 + i * 35, 278)).join('\n')}
    <path d="M24 319 H436" class="border"/>
    <text x="24" y="340" class="muted" font-size="11">${escape(project.stack)}</text>
    <text x="436" y="340" text-anchor="end" fill="${project.accent}" font-size="11" font-weight="600">${sourceLabel}</text>
  </g>
</svg>\n`;
  const filename = `${project.file}${lang === 'vi' ? '-vi' : ''}.svg`;
  writeFileSync(join(destination, filename), svg);
  console.log(`Generated ${filename}`);
}
}
