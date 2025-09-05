#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎵 Updating all musicL playlists...\n');

const scripts = [
  'create-upbeats-playlist.js',
  'create-flowgnar-playlist.js', 
  'create-satsandsounds-playlist.js',
  'create-muttonmead-playlist.js',
  'create-behindtheschemes-playlist.js',
  'create-mikesmixtape-playlist.js'
];

const results = [];

scripts.forEach(script => {
  try {
    console.log(`📝 Running ${script}...`);
    execSync(`node scripts/${script}`, { stdio: 'inherit' });
    results.push({ script, status: '✅ Success' });
  } catch (error) {
    console.error(`❌ Error running ${script}:`, error.message);
    results.push({ script, status: '❌ Failed' });
  }
});

console.log('\n📊 Update Summary:');
results.forEach(result => {
  console.log(`  ${result.status} ${result.script}`);
});

const successCount = results.filter(r => r.status.includes('✅')).length;
console.log(`\n🎉 Updated ${successCount}/${scripts.length} playlists successfully!`);

if (successCount === scripts.length) {
  console.log('\n💡 Next steps:');
  console.log('  1. Review the updated XML files in docs/');
  console.log('  2. Commit and push changes: git add . && git commit -m "Update all playlists" && git push');
  console.log('  3. The feeds will be automatically updated on GitHub');
}
