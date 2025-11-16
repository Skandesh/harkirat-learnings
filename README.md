# What Kirat is Learning - Link Gallery

A beautiful, auto-updating link gallery that showcases curated learning resources from [@kirat_tw's GitHub repository](https://github.com/hkirat/what-im-learning).

## Features

- **Smart Caching** - Fetches metadata once and stores it. Never re-fetches existing links.
- **YouTube Integration** - Shows video thumbnails and titles for YouTube links.
- **Open Graph Support** - Displays images, titles, and descriptions for websites.
- **Auto-Updates** - GitHub Actions runs every 15 hours to fetch new links and update dates.
- **Beautiful UI** - Modern, responsive card-based design with dark theme.
- **Filter by Type** - Easily filter between YouTube videos and websites.
- **Zero Maintenance** - Fully automated via GitHub Actions.

## How It Works

### Architecture

```
┌─────────────────────────────────────────────┐
│  GitHub Action (runs every 15 hours)        │
├─────────────────────────────────────────────┤
│  1. Fetch README.md from hkirat's repo      │
│  2. Load existing links-data.json           │
│  3. Compare: find NEW links only            │
│  4. For new links:                          │
│     - YouTube: extract ID, get thumbnail    │
│     - Others: fetch Open Graph data         │
│  5. Query git history for accurate dates    │
│     - Uses GitHub token for 5000 req/hr     │
│     - Skips links with existing dates       │
│  6. Merge with existing data                │
│  7. Save updated links-data.json to repo    │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Frontend (index.html)                      │
├─────────────────────────────────────────────┤
│  1. Load links-data.json (instant!)         │
│  2. Display beautiful cards:                │
│     - YouTube: thumbnail + title            │
│     - Others: OG image + title + desc       │
└─────────────────────────────────────────────┘
```

### Smart Caching Logic

The script compares URLs in the README with `links-data.json`:

1. **New links** - Fetches metadata and adds to storage
2. **Existing links** - Skips fetching (uses cached data)
3. **Removed links** - Deletes from storage to stay in sync

This means:
- First run: Fetches all links
- Subsequent runs: Only fetches NEW links
- No redundant API calls = faster updates + no rate limits

## Project Structure

```
/
├── index.html              # Beautiful frontend
├── links-data.json         # Cached metadata (auto-updated)
├── .github/workflows/
│   └── fetch-links.yml     # GitHub Action workflow
└── scripts/
    └── fetch-metadata.js   # Node.js script to process links
```

## Setup & Deployment

### Option 1: GitHub Pages (Recommended)

1. Fork this repository
2. Go to Settings → Pages
3. Set Source to "Deploy from a branch"
4. Select branch: `main` (or your branch)
5. Save and wait for deployment

Your site will be live at: `https://<username>.github.io/<repo-name>/`

### Option 2: Netlify

1. Fork this repository
2. Go to [Netlify](https://netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect your GitHub and select the forked repo
5. Deploy!

### Option 3: Vercel

1. Fork this repository
2. Go to [Vercel](https://vercel.com)
3. Click "Add New" → "Project"
4. Import your forked repo
5. Deploy!

## Manual Testing

### Fetch new links metadata:

```bash
node scripts/fetch-metadata.js
```

This will:
1. Fetch the README from hkirat's repository
2. Extract all links
3. Fetch metadata for new links
4. Update `links-data.json`

### Update dates with accurate git history (one-time migration):

To get the **actual dates** when links were added to the repository:

```bash
node scripts/update-dates-from-git.js
```

Or use the bash version:

```bash
bash scripts/update-dates-from-git.sh
```

This will:
1. Query GitHub's commit history for README.md
2. Find when each URL was first added
3. Update `addedAt` with the actual commit date
4. **Note**: This makes many API calls and may take 10-20 minutes

Then open `index.html` in your browser to see the gallery.

## Customization

### Change Update Frequency

Edit `.github/workflows/fetch-links.yml`:

```yaml
schedule:
  - cron: '0 */15 * * *'  # Every 15 hours (900 minutes) - current setting
  # Change to:
  - cron: '*/30 * * * *'  # Every 30 minutes
  - cron: '0 * * * *'     # Every hour
  - cron: '0 */6 * * *'   # Every 6 hours
```

### Modify Styling

Edit the CSS in `index.html` to customize:
- Colors (see `:root` CSS variables)
- Card layout
- Typography
- Dark/Light theme

### Point to Different Repository

Edit `scripts/fetch-metadata.js`:

```javascript
const repoUrl = 'https://api.github.com/repos/hkirat/what-im-learning/contents/README.md';
// Change to your target repository
```

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript (no frameworks!)
- **Backend**: Node.js (built-in modules only)
- **Automation**: GitHub Actions
- **Hosting**: GitHub Pages / Netlify / Vercel

## License

MIT

## Credits

Built with ❤️ for the learning community.

Original content by [@kirat_tw](https://github.com/hkirat)
