const https = require('https');
const fs = require('fs');
const path = require('path');
const { DOMParser } = require('xmldom');

async function createDoerfelversePlaylist() {
  try {
    console.log('🎵 Creating Into The Doerfel-Verse musicL playlist...');
    
    const feedUrl = 'https://www.doerfelverse.com/feeds/intothedoerfelverse.xml';
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
    
    // Generate the musicL XML
    const xml = generatePlaylistFromRemoteItems(remoteItems);
    
    const outputPath = path.join(__dirname, '../docs/doerfelverse-playlist.xml');
    fs.writeFileSync(outputPath, xml, 'utf8');
    
    console.log(`🎉 Into The Doerfel-Verse playlist created successfully!`);
    console.log(`📁 File: ${outputPath}`);
    console.log(`🎵 Tracks: ${remoteItems.length}`);
    
  } catch (error) {
    console.error('❌ Error creating playlist:', error.message);
    throw error;
  }
}

function generatePlaylistFromRemoteItems(remoteItems) {
  const now = new Date().toUTCString();
  const playlistGuid = generateUUIDv4();

  let xml = `<rss version="2.0" xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <author>ChadF</author>
    <title>Into The Doerfel-Verse Music Playlist</title>
    <description>Music tracks from Into The Doerfel-Verse podcast featuring The Doerfels band and Value4Value artists</description>
    <link>https://www.doerfelverse.com/</link>
    <language>en</language>
    <pubDate>${now}</pubDate>
    <lastBuildDate>${now}</lastBuildDate>
    <image>
      <url></url>
    </image>
    <podcast:medium>musicL</podcast:medium>
    <podcast:guid>${playlistGuid}</podcast:guid>
`;

  remoteItems.forEach(item => {
    xml += `    <podcast:remoteItem feedGuid="${item.feedGuid}" itemGuid="${item.itemGuid}" />
`;
  });

  xml += `  </channel>
</rss>`;

  return xml;
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

function generateUUIDv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Run the script
if (require.main === module) {
  createDoerfelversePlaylist()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { createDoerfelversePlaylist };
