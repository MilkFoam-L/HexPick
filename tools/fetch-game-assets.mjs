// 从 CommunityDragon（英雄联盟游戏文件的社区解包镜像）下载海克斯大乱斗界面素材到 assets/game/。
// 素材版权归 Riot Games 所有，见 assets/game/NOTICE.md。
// 用法：node tools/fetch-game-assets.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const CDN = 'https://raw.communitydragon.org/latest/';
const UX = 'game/assets/ux/';
const CLIENT = 'plugins/rcp-be-lol-game-data/global/default/content/src/leagueclient/';
const OUT = 'assets/game';

/** [保存路径, 源路径] */
const FILES = [
  ['card/bg.png', `${UX}cherry/augments/augmentselection/augmentcard_bg.png`],
  ['card/frame_silver.png', `${UX}cherry/augments/augmentselection/augmentcard_frame_silver.png`],
  ['card/frame_gold.png', `${UX}cherry/augments/augmentselection/augmentcard_frame_gold.png`],
  ['card/frame_prismatic.png', `${UX}cherry/augments/augmentselection/augmentcard_frame_prismatic.png`],
  ['card/sheen_silver.png', `${UX}cherry/augments/augmentselection/augmentcard_sheenglow_silver.png`],
  ['card/sheen_gold.png', `${UX}cherry/augments/augmentselection/augmentcard_sheenglow_gold.png`],
  ['card/sheen_prismatic.png', `${UX}cherry/augments/augmentselection/augmentcard_sheenglow_prismatic.png`],
  ['card/notpicked.png', `${UX}cherry/augments/augmentselection/augmentcard_notpicked.png`],
  ['card/shadow.png', `${UX}cherry/augments/augmentselection/augmentcard_shadow.png`],
  ['card/holo.png', `${UX}kiwi/augments/augmentselection/augmentcard_bg_holo_02.png`],
  ['card/goldswipe.png', `${UX}kiwi/augments/augmentselection/augmentcard_goldreroll_cardswipe.png`],
  ['card/iconback_silver.png', `${UX}kiwi/augments/augmentselection/augmenticon_defaultbacklayer_silver.png`],
  ['card/iconback_gold.png', `${UX}kiwi/augments/augmentselection/augmenticon_defaultbacklayer_gold.png`],
  ['card/iconback_prismatic.png', `${UX}kiwi/augments/augmentselection/augmenticon_defaultbacklayer_prismatic.png`],
  ['ui/reroll.png', `${UX}floatingtext/rerollicon.png`],
  ['ui/stage_completed.png', `${UX}cherry/stageicons/augmentsselectioncompleted.png`],
  ['ui/stage_current.png', `${UX}cherry/stageicons/augmentsselectioncurrent.png`],
  ['ui/stage_upcoming.png', `${UX}cherry/stageicons/augmentsselectionupcoming.png`],
  // 嚎哭深渊（海克斯大乱斗地图）客户端场景图
  ['bg/abyss.jpg', `${CLIENT}gamemodeassets/aram/img/parties-background.jpg`],
  // 强化选择界面特效贴图
  ['fx/flare.png', `${UX}cherry/augments/augmentselection/turbo_xphud_flare.png`],
  ['fx/hover_mask.png', `${UX}cherry/augments/augmentselection/augmenthover_mask.png`],
  ['fx/refresh_mask.png', `${UX}cherry/augments/augmentselection/augmentrefresh_mask.png`],
  ['fx/dissolve.png', `${UX}cherry/augments/augmentselection/augmentcard_dissolve_01.png`],
  ['fx/pulse.png', `${UX}cherry/augments/augmentselection/pulse.png`],
  ['fx/spark.png', `${UX}cherry/augments/augmentselection/augment_pickme_prestige_speark.png`],
  ['fx/trail.png', `${UX}cherry/augments/augmentselection/augment_pickme_trail_01.png`],
  ['fx/lightning.png', `${UX}cherry/augments/augmentselection/lightning.png`],
];

const ICON_DIR = `${UX}kiwi/augments/icons/`;

async function fetchBytes(path) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(CDN + path);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      if (attempt === 3) throw new Error(`${path}: ${e.message}`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

async function save(rel, bytes) {
  const file = join(OUT, rel);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, bytes);
}

/** 海克斯大乱斗强化图标：优先 _large；同名只保留一份，key 为去掉后缀的文件名 */
async function iconList() {
  const html = (await fetchBytes(ICON_DIR)).toString('utf8');
  const files = [...html.matchAll(/href="([a-z0-9_]+\.png)"/g)].map((m) => m[1]);
  const byKey = new Map();
  for (const f of files) {
    const key = f.replace(/_(large|small)\.png$/, '').replace(/\.png$/, '');
    const rank = f.endsWith('_large.png') ? 2 : f.endsWith('_small.png') ? 0 : 1;
    if (!byKey.has(key) || byKey.get(key).rank < rank) byKey.set(key, { file: f, rank });
  }
  return [...byKey.entries()].sort(([a], [b]) => a.localeCompare(b));
}

async function main() {
  let failed = 0;
  for (const [rel, src] of FILES) {
    const bytes = await fetchBytes(src);
    if (!bytes) {
      console.error(`缺失：${src}`);
      failed++;
      continue;
    }
    await save(rel, bytes);
    console.log(`✓ ${rel}`);
  }
  const icons = await iconList();
  const saved = [];
  const queue = [...icons];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (queue.length) {
        const [key, { file }] = queue.shift();
        const bytes = await fetchBytes(ICON_DIR + file);
        if (!bytes) continue;
        await save(`icons/${key}.png`, bytes);
        saved.push(key);
      }
    }),
  );
  saved.sort();
  await save('icons/index.json', `${JSON.stringify(saved, null, 0)}\n`);
  console.log(`✓ ${saved.length} 个强化图标`);
  if (failed) process.exitCode = 1;
}

await main();
