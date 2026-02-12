const https = require('https');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'client', 'public', 'images', 'landing');

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

const cards = [
  { name: 'black-lotus', query: 'Black Lotus' },
  { name: 'sol-ring', query: 'Sol Ring' },
  { name: 'lightning-bolt', query: 'Lightning Bolt' },
  { name: 'counterspell', query: 'Counterspell' },
  { name: 'birds-of-paradise', query: 'Birds of Paradise' },
  { name: 'dark-ritual', query: 'Dark Ritual' },
  { name: 'time-walk', query: 'Time Walk' },
  { name: 'ancestral-recall', query: 'Ancestral Recall' },
  { name: 'mox-emerald', query: 'Mox Emerald' },
  { name: 'mox-jet', query: 'Mox Jet' },
  { name: 'mox-pearl', query: 'Mox Pearl' },
  { name: 'mox-ruby', query: 'Mox Ruby' },
  { name: 'mox-sapphire', query: 'Mox Sapphire' },
  { name: 'time-vault', query: 'Time Vault' },
  { name: 'force-of-will', query: 'Force of Will' },
  { name: 'brainstorm', query: 'Brainstorm' },
  { name: 'tarmogoyf', query: 'Tarmogoyf' },
  { name: 'jace-the-mind-sculptor', query: 'Jace, the Mind Sculptor' },
  { name: 'cyclonic-rift', query: 'Cyclonic Rift' },
  { name: 'rhystic-study', query: 'Rhystic Study' },
  { name: 'smothering-tithe', query: 'Smothering Tithe' },
  { name: 'teferis-protection', query: 'Teferi\'s Protection' },
  { name: 'esper-sentinel', query: 'Esper Sentinel' },
  { name: 'dockside-extortionist', query: 'Dockside Extortionist' },
  { name: 'mana-crypt', query: 'Mana Crypt' },
  { name: 'the-one-ring', query: 'The One Ring' }
];

const download = (query, dest) => {
  const url = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(query)}&format=image&version=large`;
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, {
      headers: {
        'User-Agent': 'MTGBinder/1.0',
        'Accept': 'image/jpeg'
      }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        https.get(response.headers.location, (res) => {
           res.pipe(file);
           file.on('finish', () => file.close(resolve));
        }).on('error', reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${query}' (${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
};

async function main() {
  console.log('Starting downloads...');
  for (const card of cards) {
    const dest = path.join(dir, `${card.name}.jpg`);
    try {
      await download(card.query, dest);
      console.log(`Downloaded ${card.name}`);
    } catch (err) {
      console.error(`Error downloading ${card.name}: ${err.message}`);
    }
  }
  console.log('Done!');
}

main();
