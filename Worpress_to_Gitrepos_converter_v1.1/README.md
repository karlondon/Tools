# WordPress to Git Repository Converter - Version 1.1

A powerful tool to migrate WordPress sites to Git repositories or GitHub Pages, preserving all content, media, and structure.

## 🆕 What's New in Version 1.1

### Enhanced Features:
- ✅ **Categories Documentation** - Complete category hierarchy and usage statistics
- ✅ **Tags Documentation** - Tag cloud and comprehensive tag information
- ✅ **Plugin Documentation** - List of all installed plugins with versions and configurations
- ✅ **Site Configuration** - WordPress version, theme info, and site settings
- ✅ **Migration Summary** - Comprehensive report of all migrated content
- ✅ **JSON Export** - Machine-readable format for all documentation

### New Documentation Files Created:
- `PLUGINS.md` - Detailed plugin list with versions and requirements
- `CATEGORIES.md` - Category hierarchy and statistics
- `TAGS.md` - Tag cloud and usage information
- `SITE_INFO.md` - WordPress configuration and theme details
- `MIGRATION_SUMMARY.md` - Complete migration report
- JSON files for programmatic access

## Features

- 📝 Exports WordPress posts and pages to Markdown format
- 🖼️ Downloads and organizes media files
- 🏷️ **NEW:** Preserves and documents categories and tags
- 🔌 **NEW:** Documents installed plugins and configurations
- ⚙️ **NEW:** Exports site configuration and theme information
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

### Quick Install

```bash
cd Worpress_to_Gitrepos_converter_v1.1
pip install -r requirements.txt
python verify_installation.py
```

**For detailed installation help, see [INSTALL.md](INSTALL.md)**

## Configuration

Create a `config.yaml` file:

```yaml
wordpress:
  site_url: "https://your-wordpress-site.com"
  username: "your_wp_username"
  app_password: "xxxx xxxx xxxx xxxx xxxx xxxx"

github:
  token: "ghp_your_github_personal_access_token"
  username: "your_github_username"
  repository: "your-repo-name"
  branch: "main"

migration:
  content_types:
    - posts
    - pages
    - media
  output_directory: "./output"
  markdown_flavor: "github"
  download_media: true
```

## Usage

### Basic Migration

```bash
python run.py
```

### Dry Run (Preview)

```bash
python run.py --dry-run
```

### Migrate Specific Content

```bash
python run.py --types posts,pages
```

## Output Structure (Version 1.1)

```
output/
├── posts/                      # Blog posts in Markdown
│   ├── 2024-01-15-post-1.md
│   └── 2024-01-20-post-2.md
├── pages/                      # Static pages
│   ├── about.md
│   └── contact.md
├── assets/                     # Media files
│   └── images/
│       ├── image1.jpg
│       └── image2.png
├── site_documentation/         # 🆕 NEW IN V1.1
│   ├── PLUGINS.md             # Plugin documentation
│   ├── CATEGORIES.md          # Category hierarchy
│   ├── TAGS.md                # Tag information
│   ├── SITE_INFO.md           # Site configuration
│   ├── MIGRATION_SUMMARY.md   # Migration report
│   ├── plugins.json           # Plugin data (JSON)
│   ├── categories.json        # Category data (JSON)
│   ├── tags.json              # Tag data (JSON)
│   └── site_info.json         # Site data (JSON)
└── index.md                    # Blog index
```

## Version 1.1 Enhancements

### 1. Categories Documentation

The tool now exports complete category information:
- **Hierarchical structure** - Parent/child relationships
- **Usage statistics** - Post counts per category
- **Descriptions** - Category descriptions and metadata
- **Slugs** - URL-friendly category identifiers

**Example:** `site_documentation/CATEGORIES.md`

### 2. Tags Documentation

Comprehensive tag information including:
- **Tag cloud** - Visual representation by usage
- **Most used tags** - Top 20 tags by post count
- **Complete list** - All tags with descriptions
- **Statistics** - Usage counts and metadata

**Example:** `site_documentation/TAGS.md`

### 3. Plugin Documentation

Documents all installed plugins:
- **Active plugins** - Currently active plugins
- **Inactive plugins** - Installed but not active
- **Version information** - Plugin versions and requirements
- **Configuration notes** - How to preserve settings

**Example:** `site_documentation/PLUGINS.md`

**Note:** Plugin configurations are stored in the WordPress database. The tool provides guidance on how to backup and preserve these settings.

### 4. Site Configuration

Exports WordPress site details:
- **WordPress version** - Version information
- **Active theme** - Theme name and details
- **Site settings** - Timezone, URL, description
- **API information** - Available REST API endpoints

**Example:** `site_documentation/SITE_INFO.md`

### 5. Migration Summary

Comprehensive migration report:
- **Content statistics** - Posts, pages, media counts
- **Documentation counts** - Categories, tags, plugins
- **Repository information** - GitHub repository URL
- **Completion status** - Success indicators

**Example:** `site_documentation/MIGRATION_SUMMARY.md`

## Comparison: Version 1.0 vs 1.1

| Feature | v1.0 | v1.1 |
|---------|------|------|
| Posts Migration | ✅ | ✅ |
| Pages Migration | ✅ | ✅ |
| Media Download | ✅ | ✅ |
| Categories Export | ❌ | ✅ |
| Tags Export | ❌ | ✅ |
| Plugin Documentation | ❌ | ✅ |
| Site Configuration | ❌ | ✅ |
| JSON Export | ❌ | ✅ |
| Migration Summary | ❌ | ✅ |

## GitHub Pages Setup

For GitHub Pages deployment:

1. Set `markdown_flavor: "jekyll"` in config
2. Set `branch: "gh-pages"` in config
3. Run the migration
4. Enable GitHub Pages in repository settings

## Use Cases for New Documentation

### 1. Site Backup

Complete documentation serves as a backup of your WordPress configuration:
- Plugin versions for reinstallation
- Category structure for content organization
- Tag information for content discovery

### 2. Migration Planning

When moving to a new platform:
- Understand category hierarchy
- Identify most-used tags
- Know which plugins need replacement

### 3. Content Analysis

Analyze your WordPress site:
- Content distribution across categories
- Tag usage patterns
- Plugin dependencies

### 4. Team Handoff

Comprehensive documentation for team transitions:
- Complete plugin list with versions
- Site configuration details
- Content organization structure

## Troubleshooting

### Plugin Information Not Available

Some WordPress sites restrict plugin information via REST API. If plugin documentation is empty:

1. **Check WordPress version** - Requires WordPress 5.5+
2. **Check permissions** - Admin credentials may be required
3. **Check security plugins** - Some plugins block this endpoint
4. **Manual export** - Export plugin list from WP Admin > Plugins

### Categories/Tags Not Exporting

Ensure:
- WordPress REST API is enabled
- Categories and tags exist in your WordPress site
- Authentication credentials are correct

## Advanced Features

### JSON Export

All documentation is also exported as JSON for programmatic access:

```python
import json

# Load categories
with open('site_documentation/categories.json') as f:
    categories = json.load(f)

# Load plugins
with open('site_documentation/plugins.json') as f:
    plugins = json.load(f)
```

### Custom Processing

Use the JSON exports for:
- Custom reporting
- Data analysis
- Integration with other tools
- Automated documentation

## Security Notes

- Never commit `config.yaml` with credentials
- Use WordPress Application Passwords
- Use GitHub Personal Access Tokens with minimal permissions
- Store sensitive configs in environment variables

## Changelog

### Version 1.1 (2026-01-24)
- Added categories documentation and export
- Added tags documentation and tag cloud
- Added plugin documentation with version info
- Added site configuration export
- Added comprehensive migration summary
- Added JSON export for all documentation
- Improved error handling for documentation features

### Version 1.0 (2026-01-23)
- Initial release
- Posts and pages migration
- Media download
- GitHub integration
- Markdown conversion

## Contributing

Contributions welcome! Please submit issues and pull requests.

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Version 1.1** - Enhanced WordPress to Git Migration Tool with Complete Site Documentation