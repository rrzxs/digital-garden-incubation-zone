import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const seedConfigSource = fs.readFileSync(
  new URL('../seed-config.js', import.meta.url),
  'utf8'
);

function loadSeedConfig() {
  const context = {
    globalThis: {}
  };

  vm.runInNewContext(seedConfigSource, context);
  return context.globalThis.DigitalGardenSeedConfig;
}

test('the incubator entry is always pinned to the first position', () => {
  const seeds = loadSeedConfig().getOrderedSeeds();

  assert.equal(seeds[0].path, '/seed/seeds/incubator/index.html');
  assert.equal(seeds[0].isEntry, true);
});

test('all seed paths use the /seed absolute prefix to avoid base-url drift', () => {
  const seeds = loadSeedConfig().getOrderedSeeds();

  for (const seed of seeds) {
    assert.match(seed.path, /^\/seed\/seeds\/.+\/index\.html$/);
  }
});

test('published seed count excludes the incubator entry', () => {
  const seedConfig = loadSeedConfig();
  const seeds = seedConfig.getOrderedSeeds();
  const publishedCount = seeds.filter((item) => !item.isEntry).length;

  assert.equal(seedConfig.countPublishedSeeds(seeds), publishedCount);
  assert.ok(publishedCount >= 8);
});

test('frequency garden seed is registered as a published healing tool', () => {
  const seeds = loadSeedConfig().getOrderedSeeds();
  const frequencyGarden = seeds.find((item) => item.path === '/seed/seeds/frequency-garden/index.html');

  assert.ok(frequencyGarden);
  assert.equal(frequencyGarden.category, 'wellness');
  assert.match(frequencyGarden.title, /Frequency Garden|调频/);
});
