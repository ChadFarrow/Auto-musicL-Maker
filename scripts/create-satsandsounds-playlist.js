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

// Function to generate musicL playlist XML from actual remote items
function generatePlaylistFromRemoteItems(feedData, remoteItems) {
  const now = new Date().toUTCString();
  const playlistGuid = generateUUIDv4();
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:podcast="https://podcastindex.org/namespace/1.0">
  <channel>
    <title>Sats and Sounds Music Playlist</title>
    <description>Curated playlist from Sats and Sounds podcast featuring Value4Value independent artists</description>
    <author>Auto musicL Maker</author>
    <link>https://satsandsounds.com/</link>
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
async function createSatsAndSoundsPlaylist() {
  try {
    console.log('🎵 Fetching Sats and Sounds RSS feed...');
    
    const feed = await parser.parseURL('https://satsandsounds.com/saspodcast.xml');
    
    console.log(`📻 Found ${feed.items.length} episodes`);
    console.log(`🎤 Podcast: ${feed.title}`);
    
    // Extract existing remote items from the feed
    const remoteItems = [];
    
    // Get the raw XML to parse remote items
    const https = require('https');
    const xmlData = await new Promise((resolve, reject) => {
      https.get('https://satsandsounds.com/saspodcast.xml', (res) => {
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
    const outputPath = path.join(__dirname, '..', 'docs', 'satsandsounds-playlist.xml');
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
  createSatsAndSoundsPlaylist();
}

module.exports = { createSatsAndSoundsPlaylist };
