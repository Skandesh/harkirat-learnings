#!/bin/bash

echo "🔍 Fetching accurate git history dates for all links..."
echo ""

# Read all URLs from links-data.json
urls=$(jq -r 'keys[]' links-data.json)
total=$(echo "$urls" | wc -l)
count=0

# Fetch commit history once
echo "📥 Fetching commit history from GitHub..."
commits=$(curl -s "https://api.github.com/repos/hkirat/what-im-learning/commits?path=README.md&per_page=100")

if [ $? -ne 0 ]; then
  echo "❌ Failed to fetch commits"
  exit 1
fi

echo "✅ Got commit history"
echo ""

# Process each URL
echo "$urls" | while read -r url; do
  count=$((count + 1))
  echo "[$count/$total] Processing: ${url:0:60}..."

  # Search through commits from oldest to newest
  date_found=""

  # Get all commit SHAs in reverse order (oldest first)
  shas=$(echo "$commits" | jq -r '.[] | .sha' | tac)

  for sha in $shas; do
    # Get the commit details with patch
    commit_data=$(curl -s "https://api.github.com/repos/hkirat/what-im-learning/commits/$sha")

    # Check if the URL was added in this commit
    patch=$(echo "$commit_data" | jq -r '.files[]? | select(.filename == "README.md") | .patch // empty')

    if echo "$patch" | grep -q "^+.*$url"; then
      # Found the commit where this URL was added!
      date_found=$(echo "$commit_data" | jq -r '.commit.author.date')
      echo "  ✓ Found! Added on $(echo $date_found | cut -d'T' -f1)"
      break
    fi

    # Small delay to avoid rate limiting
    sleep 0.2
  done

  # If not found, use current date
  if [ -z "$date_found" ]; then
    date_found=$(date -Iseconds)
    echo "  ⚠ Not found in history, using current date"
  fi

  # Update the JSON file
  jq --arg url "$url" --arg date "$date_found" \
    '.[$url].addedAt = $date' links-data.json > links-data.json.tmp
  mv links-data.json.tmp links-data.json

  echo ""
done

echo "✅ Complete! All links updated with accurate git dates"
