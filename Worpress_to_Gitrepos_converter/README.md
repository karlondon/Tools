# WordPress to Git Repository Converter

A powerful tool to migrate WordPress sites to Git repositories or GitHub Pages, preserving all content, media, and structure.

## Features

- 📝 Exports WordPress posts and pages to Markdown format
- 🖼️ Downloads and organizes media files
- 🏷️ Preserves categories, tags, and metadata
- 📁 Creates organized folder structure
- 🔄 Supports incremental updates
- 🚀 Direct push to GitHub repositories
- 🎨 GitHub Pages ready output
- 🔐 Secure credential management

## Requirements

- Python 3.8+
- WordPress site with REST API enabled (WordPress 4.7+)
- GitHub account and personal access token
- Git installed on your system

## Installation

### Important Note About IDE Errors

If you see import errors in your IDE (VS Code, PyCharm, etc.), **this is normal!** These are just warnings that packages haven't been installed yet. Once you run `pip install -r requirements.txt`, all errors will disappear.

### Installation Steps

1. Navigate to the project directory:
```bash
cd Worpress_to_Gitrepos_converter
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Verify installation (optional but recommended):
```bash
python verify_installation.py
```

4. Configure your credentials (see Configuration section below)

**For detailed installation help, see [INSTALL.md](INSTALL.md)**

## Configuration

Create a `config.yaml` file in the root directory:

```yaml
wordpress:
  site_url: "https://your-wordpress-site.com"
  username: "your_wp_username"
  password: "your_wp_password"
  # Or use application password (recommended)
  app_password: "xxxx xxxx xxxx xxxx xxxx xxxx"

github:
  token: "ghp_your_github_personal_access_token"
  username: "your_github_username"
  repository: "your-repo-name"
  branch: "main"  # or "gh-pages" for GitHub Pages

migration:
  content_types:
    - posts
    - pages
    - media
  output_directory: "./output"
  markdown_flavor: "github"  # github, jekyll, hugo
  preserve_dates: true
  download_media: true
  media_directory: "assets/images"
  create_index: true
  
git:
  commit_message: "Migrated from WordPress"
  author_name: "WordPress Migration Bot"
  author_email: "bot@example.com"
```

## Usage

### Basic Migration

```bash
python run.py
```

### Dry Run (Preview without committing)

```bash
python run.py --dry-run
```

### Migrate Specific Content Types

```bash
python run.py --types posts,pages
```

### Skip Media Download

```bash
python run.py --skip-media
```

### Use Custom Config File

```bash
python run.py --config my-config.yaml
```

## Output Structure

```
output/
├── posts/
│   ├── 2024-01-15-my-first-post.md
│   └── 2024-01-20-another-post.md
├── pages/
│   ├── about.md
│   └── contact.md
├── assets/
│   └── images/
│       ├── image1.jpg
│       └── image2.png
├── _config.yml (if Jekyll format)
└── index.md
```

## GitHub Pages Setup

For GitHub Pages deployment:

1. Set `markdown_flavor: "jekyll"` in config
2. Set `branch: "gh-pages"` in config
3. Run the migration
4. Enable GitHub Pages in your repository settings

## Security Notes

- Never commit `config.yaml` with credentials to version control
- Use WordPress Application Passwords instead of main password
- Use GitHub Personal Access Tokens with minimal required permissions
- Store sensitive configs in environment variables for production use

## Troubleshooting

### WordPress REST API Not Accessible
- Ensure WordPress REST API is enabled
- Check for security plugins blocking API access
- Verify permalink settings are not set to "Plain"

### GitHub Push Failures
- Verify GitHub token has `repo` permissions
- Check repository exists and you have write access
- Ensure Git is properly configured locally

### Media Download Issues
- Check WordPress media library permissions
- Verify network connectivity
- Consider using `--skip-media` for initial testing

## Advanced Features

### Custom Front Matter
Customize the front matter template in `src/content_converter.py`

### Post Processing Hooks
Add custom processing in `src/migration_orchestrator.py`

### Incremental Updates
The tool tracks migrated content and only updates changed items

## Contributing

Contributions welcome! Please submit issues and pull requests.

## License

MIT License - See LICENSE file for details