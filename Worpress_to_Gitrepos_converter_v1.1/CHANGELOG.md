# Changelog - WordPress to Git Converter

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-01-24

### 🆕 Added

#### Categories & Tags Support
- **Categories Documentation**: Export complete category hierarchy with parent/child relationships
- **Tag Documentation**: Generate tag clouds and usage statistics  
- **Category Statistics**: Post counts and usage metrics per category
- **Tag Analytics**: Most used tags and comprehensive tag information

#### Plugin Documentation  
- **Plugin Inventory**: List all installed WordPress plugins
- **Version Tracking**: Record plugin versions and requirements
- **Active/Inactive Status**: Separate active and inactive plugins
- **Plugin Metadata**: Author, description, and URLs
- **Configuration Notes**: Guidance on preserving plugin settings

#### Site Configuration Export
- **WordPress Version**: Record WordPress version information
- **Theme Details**: Active theme name and configuration
- **Site Settings**: URL, description, timezone information
- **API Information**: Available REST API endpoints and namespaces

#### Documentation Features
- **JSON Export**: Machine-readable format for all documentation
- **Migration Summary**: Comprehensive report of migrated content
- **Site Documenter Module**: New dedicated module for documentation (`site_documenter.py`)
- **Structured Output**: Organized `site_documentation/` folder

### 📄 New Documentation Files

Generated in `site_documentation/` folder:
- `PLUGINS.md` - Complete plugin documentation
- `CATEGORIES.md` - Category hierarchy and usage
- `TAGS.md` - Tag cloud and statistics
- `SITE_INFO.md` - Site configuration details
- `MIGRATION_SUMMARY.md` - Migration report
- `plugins.json` - Plugin data (JSON format)
- `categories.json` - Category data (JSON format)
- `tags.json` - Tag data (JSON format)
- `site_info.json` - Site information (JSON format)

### 🔧 Enhanced

#### WordPress Client (`wordpress_client.py`)
- Added `get_categories()` method
- Added `get_tags()` method
- Added `get_plugins()` method
- Added `get_site_info()` method
- Added `get_theme_info()` method
- Improved error handling for new endpoints

#### Migration Orchestrator (`migration_orchestrator.py`)
- Added `document_site()` method
- Enhanced migration summary with documentation stats
- Added state tracking for documented items
- Improved logging for documentation processes

### 📊 Output Structure Changes

**Before (v1.0):**
```
output/
├── posts/
├── pages/
├── assets/images/
└── index.md
```

**After (v1.1):**
```
output/
├── posts/
├── pages/
├── assets/images/
├── site_documentation/      # 🆕 NEW
│   ├── PLUGINS.md
│   ├── CATEGORIES.md
│   ├── TAGS.md
│   ├── SITE_INFO.md
│   ├── MIGRATION_SUMMARY.md
│   └── *.json files
└── index.md
```

### 🎯 Use Cases

New documentation enables:
1. **Complete Site Backup** - Document entire WordPress configuration
2. **Migration Planning** - Understand site structure before platform migration
3. **Content Analysis** - Analyze content distribution and tagging patterns
4. **Team Handoff** - Comprehensive documentation for team transitions
5. **Plugin Inventory** - Track plugin dependencies and versions

### 🔒 Security

- Improved handling of authentication for plugin endpoint
- Better error messages for restricted endpoints
- Graceful fallback when endpoints are unavailable

### 📝 Documentation

- Enhanced README with v1.1 features
- Added troubleshooting section for new features
- Included JSON export usage examples
- Added version comparison table

### ⚡ Performance

- Maintains same performance as v1.0
- Documentation runs in parallel with content migration
- Minimal overhead for new features

---

## [1.0.0] - 2026-01-23

### Initial Release

#### Core Features
- WordPress post migration to Markdown
- WordPress page migration to Markdown
- Media file download and organization
- GitHub repository integration
- HTML to Markdown conversion
- Front matter generation
- Incremental migration support
- Dry-run mode

#### Components
- Configuration management (`config_manager.py`)
- WordPress REST API client (`wordpress_client.py`)
- Content converter (`content_converter.py`)
- GitHub manager (`github_manager.py`)
- Migration orchestrator (`migration_orchestrator.py`)

#### Documentation
- README with installation instructions
- INSTALL.md for detailed setup
- USAGE.md for user guide
- QUICKSTART.md for quick start

#### Configuration
- YAML-based configuration
- WordPress authentication support
- GitHub Personal Access Token authentication
- Customizable output structure

---

## Version Comparison

| Feature | v1.0 | v1.1 |
|---------|------|------|
| **Content Migration** | | |
| Posts | ✅ | ✅ |
| Pages | ✅ | ✅ |
| Media | ✅ | ✅ |
| **Documentation** | | |
| Categories | ❌ | ✅ |
| Tags | ❌ | ✅ |
| Plugins | ❌ | ✅ |
| Site Config | ❌ | ✅ |
| **Export Formats** | | |
| Markdown | ✅ | ✅ |
| JSON | ❌ | ✅ |
| **Reports** | | |
| Basic Summary | ✅ | ✅ |
| Detailed Summary | ❌ | ✅ |
| Documentation Report | ❌ | ✅ |

---

## Upgrade Path from v1.0 to v1.1

### For Existing Users

1. **Backup your v1.0 configuration**
   ```bash
   cp Worpress_to_Gitrepos_converter/config.yaml ~/config_backup.yaml
   ```

2. **Copy configuration to v1.1**
   ```bash
   cp ~/config_backup.yaml Worpress_to_Gitrepos_converter_v1.1/config.yaml
   ```

3. **Install dependencies** (if not already installed)
   ```bash
   cd Worpress_to_Gitrepos_converter_v1.1
   pip install -r requirements.txt
   ```

4. **Run migration**
   ```bash
   python run.py --dry-run  # Test first
   python run.py             # Actual migration
   ```

### What Gets Migrated

- ✅ All previously migrated content remains unchanged
- ✅ New documentation files are added
- ✅ Existing posts/pages/media are not re-processed (unless modified)
- ✅ New `site_documentation/` folder is created

### Breaking Changes

**None** - v1.1 is fully backward compatible with v1.0

---

## Future Roadmap

### Planned for v1.2
- Custom taxonomy support
- User/author export
- Comment migration
- Menu structure preservation
- Widget configuration export

### Planned for v2.0
- WordPress XML export support
- Database direct access option
- Multi-site support
- Advanced theme customization export
- Automated plugin replacement suggestions

---

## Contributing

We welcome contributions! Areas for contribution:
- Additional documentation formats
- Enhanced plugin configuration extraction
- Custom taxonomy handlers
- Performance improvements
- Bug fixes and testing

---

## Credits

Developed by the WordPress Migration Team
Version 1.1 - January 2026

---

*For detailed usage instructions, see [README.md](README.md)*
*For installation help, see [INSTALL.md](INSTALL.md)*