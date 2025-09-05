#!/usr/bin/env node

const Parser = require('rss-parser');

// Initialize RSS parser
const parser = new Parser();

// Function to generate UUID v4
function generateUUIDv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Function to extract artist names from episode descriptions
function extractArtists(description) {
  // Comprehensive list of artists from UpBeats episodes
  const knownArtists = [
    'Vicious Clay', 'Fepeste', 'Caleb Dyer', 'Edwin Williamson',
    'Cheap Suits', 'Jast', 'Patrick Manian', 'Nate Johnivan', 'The Trusted',
    'Johnny Elrod', 'FM Rodeo', 'Able James', 'Marina Osk',
    'Kurtisdrums', 'Ollie', 'TexasSlimsCuts', 'IAMTEXASSLIM.ORG',
    'Longy', 'Jim Costello', 'Eastside Tony', 'Survival Guide',
    'The Doerfels', 'Salty Crayon', 'The Salty Brigade', 'Digital Crate Diggers',
    'UK Artists', 'Veterans', 'Independent Artists', 'Value4Value Artists',
    'Bitcoin Music', 'Podcast Artists', 'Music Artists', 'Independent Music',
    'V4V Artists', 'Podcast Music', 'Music Podcast', 'Independent Musicians',
    'Bitcoin Podcast', 'Value4Value', 'Music Discovery', 'New Music',
    'Fresh Tracks', 'Independent Tracks', 'Podcast Tracks',
    'Music Show', 'Independent Show', 'Discovery Show', 'Music Discovery',
    'Doerfel-Verse', 'Grassfed', 'Grassfinished', 'Eargasms',
    'Boosting', 'Loving', 'TurkeyBEATs', 'V4V & Chill',
    'Feisty Foot Tappers', 'Meister Of Melodies', 'Christmas Time',
    'NYE', 'Vibe Voyage', 'For Those About To Rock', 'Queens of the Revolution',
    'Amplified Agenda', 'Tuning Out The Noise', 'Couple\'s Therapy',
    'Pathfinders', 'Deck Darlings', 'Vires In Numeris', 'Escape from clown world',
    'Volume up a smidge', 'Jamin the Halvin', 'Under the City Lights',
    'Make Music Great Again', 'Memorial Day Jams', 'Lakehouse Hammocks',
    'Sand Dollars', '3 Dolla Holla\'s', 'Let Freedom Ring', 'No BSOD Here',
    'Cassette Culture', 'End Of Summer Special', 'Sunday Stroll',
    'Starving Artists', 'Magic Number Sauce', 'ValueWeen',
    '1yr Musicversary Veteran\'s Day Special', 'Deathdrinks',
    'Liquid Vinyl', 'Salty\'s Santa Sleigh Ride', 'New Year Who\'s Dis',
    'Beef Milkshake', 'Breaker of Hearts', 'Valentine Rewind',
    'The Stars at Night are Big and Bright', 'Funky Town', 'This vs That',
    'Poached', 'Tracks 4 Tornados', 'Knot Your Node', 'Memorial Day 2025',
    'Is This Thing On', 'UK Takeover', 'Foam Finger', 'Radical Summer',
    'Back2School', 'Halfway To The Top'
  ];

  const foundArtists = [];
  knownArtists.forEach(artist => {
    if (description.toLowerCase().includes(artist.toLowerCase())) {
      foundArtists.push(artist);
    }
  });
  
  return foundArtists;
}

// Function to generate musicL playlist XML
function generatePlaylist(feedData, allArtists) {
  const now = new Date().toUTCString();
  const playlistGuid = generateUUIDv4();
  
  // Remove duplicates
  const uniqueArtists = [...new Set(allArtists)];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:podcast="https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/1.0.md">
  <channel>
    <title>UpBeats Music Playlist</title>
    <description>Curated playlist from UpBeats podcast featuring independent artists</description>
    <author>Auto musicL Maker</author>
    <link>https://upbeatspodcast.com/</link>
    <language>en</language>
    <pubDate>${now}</pubDate>
    <lastBuildDate>${now}</lastBuildDate>
    <podcast:medium>musicL</podcast:medium>
    <podcast:guid>${playlistGuid}</podcast:guid>
`;

  // Add each artist as a remote item
  uniqueArtists.forEach(artist => {
    const itemGuid = generateUUIDv4();
    xml += `    <podcast:remoteItem feedGuid="${playlistGuid}" itemGuid="${itemGuid}" />
`;
  });

  xml += `  </channel>
</rss>`;

  return xml;
}

// Function to generate musicL playlist XML from actual remote items
function generatePlaylistFromRemoteItems(feedData, remoteItems) {
  const now = new Date().toUTCString();
  const playlistGuid = generateUUIDv4();
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:podcast="https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/1.0.md">
  <channel>
    <title>UpBeats Music Playlist</title>
    <description>Curated playlist from UpBeats podcast featuring independent artists</description>
    <author>Auto musicL Maker</author>
    <link>https://upbeatspodcast.com/</link>
    <language>en</language>
    <pubDate>${now}</pubDate>
    <lastBuildDate>${now}</lastBuildDate>
    <image>
      <url></url>
    </image>
    <podcast:medium>musicL</podcast:medium>
    <podcast:guid>${playlistGuid}</podcast:guid>
`;

  // Add each remote item
  remoteItems.forEach(item => {
    xml += `    <podcast:remoteItem feedGuid="${item.feedGuid}" itemGuid="${item.itemGuid}" />
`;
  });

  xml += `  </channel>
</rss>`;

  return xml;
}

// Main function
async function createPlaylist() {
  try {
    console.log('🎵 Fetching UpBeats RSS feed...');
    
    const feed = await parser.parseURL('https://feeds.rssblue.com/upbeats');
    
    console.log(`📻 Found ${feed.items.length} episodes`);
    
    // Extract existing remote items from the feed
    const remoteItems = [];
    
    // Get the raw XML to parse remote items
    const https = require('https');
    const xmlData = await new Promise((resolve, reject) => {
      https.get('https://feeds.rssblue.com/upbeats', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
    
    // Parse XML to extract remote items
    const { DOMParser } = require('xmldom');
    const xmlParser = new DOMParser();
    const xmlDoc = xmlParser.parseFromString(xmlData, 'text/xml');
    
    const remoteItemNodes = xmlDoc.getElementsByTagName('podcast:remoteItem');
    console.log(`🎶 Found ${remoteItemNodes.length} existing remote items in feed`);
    
    for (let i = 0; i < remoteItemNodes.length; i++) {
      const item = remoteItemNodes[i];
      const feedGuid = item.getAttribute('feedGuid');
      const itemGuid = item.getAttribute('itemGuid');
      
      if (feedGuid && itemGuid) {
        remoteItems.push({ feedGuid, itemGuid });
      }
    }
    
    console.log(`📊 Extracted ${remoteItems.length} valid remote items`);
    
    // Generate the playlist XML using actual remote items
    const playlistXml = generatePlaylistFromRemoteItems(feed, remoteItems);
    
    // Save to file
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, '..', 'docs', 'upbeats-playlist.xml');
    fs.writeFileSync(outputPath, playlistXml);
    
    console.log(`✅ Playlist saved to: ${outputPath}`);
    console.log(`📊 Generated playlist with ${remoteItems.length} remote items`);
    
  } catch (error) {
    console.error('❌ Error creating playlist:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  createPlaylist();
}

module.exports = { createPlaylist };
