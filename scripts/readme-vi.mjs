// Refresh the Vietnamese README after editing the English version.
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const replacements = [
  ['<strong>EN</strong> · <a href="README.vi.md" title="Tiếng Việt">VI</a>', '<a href="README.md" title="English">EN</a> · <strong>VI</strong>'],
  ['About Me', 'Giới thiệu'],
  ["Hi, I'm Hoang, a curious human from Vietnam.", 'Xin chào, mình là Hoàng, một người luôn tò mò đến từ Việt Nam.'],
  ['I enjoy exploring technology and building things for fun.', 'Mình thích khám phá công nghệ và tạo ra những điều thú vị.'],
  ['Powered by coffee, curiosity, and a little bit of code.', 'Tiếp năng lượng bằng cà phê, sự tò mò và một chút code.'],
  ['A cat lover who enjoys the little things in life.', 'Yêu mèo và trân trọng những điều nhỏ bé trong cuộc sống.'],
  ['Always learning, experimenting, and enjoying the journey.', 'Luôn học hỏi, thử nghiệm và tận hưởng hành trình.'],
  ['Tech Stack', 'Công nghệ sử dụng'],
  ['Featured Projects', 'Dự án nổi bật'],
  ['GitHub Stats', 'Thống kê GitHub'],
  ['Activity Graph', 'Hoạt động đóng góp'],
  ['assets/projects/profile.svg', 'assets/projects/profile-vi.svg'],
  ['assets/projects/orbcomm.svg', 'assets/projects/orbcomm-vi.svg'],
  ['profile-cards/overview-en.svg', 'profile-cards/overview-vi.svg'],
  ['profile-cards/activity-en.svg', 'profile-cards/activity-vi.svg'],
  ["Hoang's GitHub statistics and most used programming languages", 'Thống kê GitHub và ngôn ngữ lập trình được Hoàng sử dụng nhiều nhất'],
  ["Hoang's daily GitHub contributions over the last 30 days", 'Hoạt động đóng góp hằng ngày của Hoàng trong 30 ngày gần nhất'],
  ['Espresso, Latte, and Cappuccino with rising animated steam', 'Espresso, Latte và Cappuccino với hiệu ứng hơi nước bay lên'],
  ['nqchwanq129: a coffee-themed GitHub profile with custom illustrations and automated activity cards. View source code.', 'nqchwanq129: hồ sơ GitHub lấy cảm hứng từ cà phê, minh họa SVG và thống kê tự động. Xem mã nguồn.'],
  ['ORBCOMM Location Tracking: a map dashboard for device locations, journeys, and commands. View source code.', 'ORBCOMM Location Tracking: bảng điều khiển bản đồ để theo dõi vị trí, hành trình và gửi lệnh cho thiết bị. Xem mã nguồn.'],
  ['alt="Profile views"', 'alt="Lượt xem hồ sơ"'],
];

let content = readFileSync(new URL('README.md', root), 'utf8');
for (const [original, translation] of replacements) {
  if (!content.includes(original)) throw new Error(`Missing translation source: ${original}`);
  content = content.replaceAll(original, translation);
}
writeFileSync(new URL('README.vi.md', root), content);
console.log('Generated README.vi.md');
