const https = require('https');
const fs = require('fs');
const path = require('path');
const { DOMParser } = require('xmldom');

async function createHomegrownHitsPlaylist() {
  try {
    console.log('🎵 Creating Homegrown Hits musicL playlist...');
    
    // Fetch the RSS feed
    const feedUrl = 'https://feed.homegrownhits.xyz/feed.xml';
    console.log(`📡 Fetching feed: ${feedUrl}`);
    
    const xmlData = await fetchRawXML(feedUrl);
    
    // Parse the XML to extract podcast:remoteItem elements
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlData, 'text/xml');
    
    const remoteItems = [];
    const remoteItemElements = doc.getElementsByTagName('podcast:remoteItem');
    
    console.log(`📋 Found ${remoteItemElements.length} remote items`);
    
    for (let i = 0; i < remoteItemElements.length; i++) {
      const item = remoteItemElements[i];
      const feedGuid = item.getAttribute('feedGuid');
      const itemGuid = item.getAttribute('itemGuid');
      
      if (feedGuid && itemGuid) {
        remoteItems.push({
          feedGuid: feedGuid,
          itemGuid: itemGuid
        });
      }
    }
    
    console.log(`✅ Extracted ${remoteItems.length} valid remote items`);
    
    // Generate UUID for the playlist
    const playlistGuid = generateUUID();
    
    // Get current date
    const now = new Date().toUTCString();
    
    // Generate the musicL XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <author>ChadF</author>
    <title>Homegrown Hits Music Playlist</title>
    <description>Curated playlist from Homegrown Hits podcast featuring Value4Value independent artists</description>
    <link>https://homegrownhits.xyz/</link>
    <language>en</language>
    <pubDate>${now}</pubDate>
    <lastBuildDate>${now}</lastBuildDate>
    <image>
      <url></url>
    </image>
    <podcast:medium>musicL</podcast:medium>
    <podcast:guid>${playlistGuid}</podcast:guid>
`;
    
    // Add all remote items
    remoteItems.forEach(item => {
      xml += `    <podcast:remoteItem feedGuid="${item.feedGuid}" itemGuid="${item.itemGuid}" />
`;
    });
    
    xml += `  </channel>
</rss>`;
    
    // Write to file
    const outputPath = path.join(__dirname, '../docs/homegrownhits-playlist.xml');
    fs.writeFileSync(outputPath, xml, 'utf8');
    
    console.log(`🎉 Homegrown Hits playlist created successfully!`);
    console.log(`📁 File: ${outputPath}`);
    console.log(`🎵 Tracks: ${remoteItems.length}`);
    
  } catch (error) {
    console.error('❌ Error creating playlist:', error.message);
    throw error;
  }
}

function fetchRawXML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Run the script
if (require.main === module) {
  createHomegrownHitsPlaylist()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createHomegrownHitsPlaylist };
