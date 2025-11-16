const https = require('https');
const fs = require('fs');

// Helper function to make HTTPS requests
function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({
        status: res.statusCode,
        text: () => data,
        json: () => JSON.parse(data),
        headers: res.headers
      }));
    }).on('error', reject);
  });
}

// Get the actual date when a URL was added to the repository
async function getActualAddedDate(url) {
  try {
    console.log(`  Looking up git history for: ${url.substring(0, 60)}...`);

    // Fetch commit history for README.md
    const commitsUrl = 'https://api.github.com/repos/hkirat/what-im-learning/commits?path=README.md&per_page=100';
    const response = await fetch(commitsUrl);

    // Check rate limit
    const remaining = response.headers['x-ratelimit-remaining'];
    console.log(`    API calls remaining: ${remaining}`);

    const commits = await response.json();

    // Go through commits from oldest to newest to find when URL was first added
    for (let i = commits.length - 1; i >= 0; i--) {
      const commit = commits[i];

      try {
        // Fetch the specific commit to get the diff
        const commitUrl = `https://api.github.com/repos/hkirat/what-im-learning/commits/${commit.sha}`;
        const commitResponse = await fetch(commitUrl);
        const commitData = await commitResponse.json();

        // Check if this commit modified README.md
        if (commitData.files) {
          for (const file of commitData.files) {
            if (file.filename === 'README.md' && file.patch) {
              // Look for the URL in added lines (lines starting with +)
              const lines = file.patch.split('\n');
              for (const line of lines) {
                // Check if this is an added line (starts with +) and contains our URL
                if (line.startsWith('+') && !line.startsWith('+++') && line.includes(url)) {
                  const addedDate = commit.commit.author.date;
                  console.log(`    ✓ Found! Added on ${addedDate.split('T')[0]}`);
                  return addedDate;
                }
              }
            }
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        // Skip this commit if there's an error
        continue;
      }
    }

    // If not found in history, return current date
    console.log(`    ⚠ Not found in recent history, using current date`);
    return new Date().toISOString();

  } catch (error) {
    console.log(`    ✗ Error: ${error.message}`);
    // If we can't determine the date, return current date
    return new Date().toISOString();
  }
}

async function main() {
  console.log('🔍 Fetching accurate git history dates for all links...\n');

  // Load existing data
  let data = {};
  try {
    const fileContent = fs.readFileSync('links-data.json', 'utf-8');
    data = JSON.parse(fileContent);
    console.log(`Loaded ${Object.keys(data).length} links\n`);
  } catch (error) {
    console.log('No existing data found');
    process.exit(1);
  }

  const urls = Object.keys(data);
  let processed = 0;
  let skipped = 0;
  let fetched = 0;

  for (const url of urls) {
    processed++;

    // Skip if this URL already has an addedAt date (optimization!)
    if (data[url].addedAt && !data[url].addedAt.includes('2025-11-16T20:02')) {
      skipped++;
      console.log(`[${processed}/${urls.length}] ⏭  Skipping (already has date): ${url.substring(0, 50)}...`);
      continue;
    }

    console.log(`[${processed}/${urls.length}] Processing link:`);

    // Get the actual added date from git history
    const actualDate = await getActualAddedDate(url);
    fetched++;

    // Update the addedAt field
    data[url].addedAt = actualDate;

    // Save after each update (in case we hit rate limits)
    fs.writeFileSync('links-data.json', JSON.stringify(data, null, 2));

    // Delay between URLs to be respectful of API limits
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('');
  }

  console.log(`\n✅ Complete!`);
  console.log(`   Processed: ${processed} links`);
  console.log(`   Skipped: ${skipped} (already had dates)`);
  console.log(`   Fetched from git: ${fetched}`);
  console.log('📅 Links are now sorted by their actual repository addition date');
}

main();
