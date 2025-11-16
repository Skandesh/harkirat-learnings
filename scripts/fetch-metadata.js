const https = require('https');
const fs = require('fs');

// Helper function to make HTTPS requests
function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, text: () => data, json: () => JSON.parse(data) }));
    }).on('error', reject);
  });
}

// Extract YouTube video ID from URL
function getYouTubeID(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Fetch YouTube video metadata
async function fetchYouTubeMetadata(url) {
  const videoId = getYouTubeID(url);
  if (!videoId) return null;

  try {
    // Use YouTube oEmbed API (no auth needed)
    const apiUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    return {
      url,
      title: data.title || 'YouTube Video',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      author: data.author_name || '',
      type: 'youtube',
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Failed to fetch YouTube metadata for ${url}:`, error.message);
    // Fallback
    return {
      url,
      title: 'YouTube Video',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      type: 'youtube',
      fetchedAt: new Date().toISOString()
    };
  }
}

// Extract Open Graph metadata from HTML
function extractOGData(html) {
  const ogData = {};

  // Extract title
  const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                     html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i) ||
                     html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) ogData.title = titleMatch[1].trim();

  // Extract image
  const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                     html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
  if (imageMatch) ogData.image = imageMatch[1].trim();

  // Extract description
  const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
                    html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i) ||
                    html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  if (descMatch) ogData.description = descMatch[1].trim();

  return ogData;
}

// Fetch Open Graph metadata for regular websites
async function fetchWebsiteMetadata(url) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const ogData = extractOGData(html);

    // Get domain for fallback
    const domain = new URL(url).hostname;

    return {
      url,
      title: ogData.title || domain,
      image: ogData.image || null,
      description: ogData.description || '',
      type: 'website',
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Failed to fetch metadata for ${url}:`, error.message);
    // Fallback with domain name
    const domain = new URL(url).hostname;
    return {
      url,
      title: domain,
      image: null,
      description: '',
      type: 'website',
      fetchedAt: new Date().toISOString()
    };
  }
}

// Fetch metadata based on URL type
async function fetchMetadata(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return await fetchYouTubeMetadata(url);
  } else {
    return await fetchWebsiteMetadata(url);
  }
}

// Parse links from README content
function parseLinks(content) {
  // Match URLs in markdown format and plain URLs
  const urlPattern = /https?:\/\/[^\s\)]+/g;
  const matches = content.match(urlPattern) || [];

  // Remove duplicates and clean up
  const uniqueLinks = [...new Set(matches)].map(url => {
    // Remove trailing punctuation
    return url.replace(/[,;.)]+$/, '');
  });

  return uniqueLinks;
}

// Main function
async function main() {
  console.log('🚀 Starting link metadata fetch...\n');

  // Step 1: Fetch README from hkirat's repo
  console.log('📥 Fetching README from hkirat/what-im-learning...');
  const repoUrl = 'https://api.github.com/repos/hkirat/what-im-learning/contents/README.md';

  try {
    const response = await fetch(repoUrl);
    const data = await response.json();
    const readmeContent = Buffer.from(data.content, 'base64').toString('utf-8');
    console.log('✅ README fetched successfully\n');

    // Step 2: Parse links from README
    console.log('🔍 Parsing links from README...');
    const extractedLinks = parseLinks(readmeContent);
    console.log(`✅ Found ${extractedLinks.length} links\n`);

    // Step 3: Load existing data
    console.log('📂 Loading existing links-data.json...');
    let existingData = {};
    try {
      const fileContent = fs.readFileSync('links-data.json', 'utf-8');
      existingData = JSON.parse(fileContent);
      console.log(`✅ Loaded ${Object.keys(existingData).length} existing entries\n`);
    } catch (error) {
      console.log('⚠️  No existing data found, starting fresh\n');
    }

    // Step 4: Compare and find NEW links only
    console.log('🔎 Comparing with existing data...');
    const newLinks = extractedLinks.filter(url => !existingData[url]);
    console.log(`✅ Found ${newLinks.length} new links to fetch\n`);

    // Step 5: Fetch metadata for new links
    if (newLinks.length > 0) {
      console.log('🌐 Fetching metadata for new links...');
      for (let i = 0; i < newLinks.length; i++) {
        const url = newLinks[i];
        console.log(`  [${i + 1}/${newLinks.length}] Fetching: ${url}`);

        const metadata = await fetchMetadata(url);
        if (metadata) {
          existingData[url] = metadata;
          console.log(`    ✅ ${metadata.title}`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      console.log('\n✅ All new links processed\n');
    } else {
      console.log('✨ No new links to fetch. Data is up to date!\n');
    }

    // Step 6: Remove links that are no longer in README (optional)
    console.log('🧹 Cleaning up removed links...');
    const currentLinksSet = new Set(extractedLinks);
    let removedCount = 0;
    for (const url in existingData) {
      if (!currentLinksSet.has(url)) {
        delete existingData[url];
        removedCount++;
      }
    }
    console.log(`✅ Removed ${removedCount} obsolete entries\n`);

    // Step 7: Save updated data
    console.log('💾 Saving updated links-data.json...');
    fs.writeFileSync('links-data.json', JSON.stringify(existingData, null, 2));
    console.log('✅ Data saved successfully\n');

    console.log(`🎉 Complete! Total links in storage: ${Object.keys(existingData).length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
