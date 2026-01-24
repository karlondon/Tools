"""
Site Documenter - New in Version 1.1
Documents WordPress site configuration, plugins, theme, and settings
"""

import json
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime
from loguru import logger


class SiteDocumenter:
    """Documents WordPress site configuration and plugins"""
    
    def __init__(self, output_dir: Path):
        """
        Initialize Site Documenter
        
        Args:
            output_dir: Directory to save documentation
        """
        self.output_dir = Path(output_dir)
        self.docs_dir = self.output_dir / 'site_documentation'
        self.docs_dir.mkdir(parents=True, exist_ok=True)
    
    def document_plugins(self, plugins: List[Dict[str, Any]]) -> None:
        """
        Document all installed plugins
        
        Args:
            plugins: List of plugin information
        """
        if not plugins:
            logger.warning("No plugin information available to document")
            return
        
        logger.info(f"Documenting {len(plugins)} plugins")
        
        # Create detailed plugins documentation
        plugins_md = self._create_plugins_markdown(plugins)
        plugins_file = self.docs_dir / 'PLUGINS.md'
        
        with open(plugins_file, 'w', encoding='utf-8') as f:
            f.write(plugins_md)
        
        # Also save as JSON for programmatic access
        plugins_json = self.docs_dir / 'plugins.json'
        with open(plugins_json, 'w', encoding='utf-8') as f:
            json.dump(plugins, f, indent=2)
        
        logger.info("Plugin documentation created")
    
    def document_categories(self, categories: List[Dict[str, Any]]) -> None:
        """
        Document all categories with their hierarchy
        
        Args:
            categories: List of category information
        """
        if not categories:
            logger.warning("No categories to document")
            return
        
        logger.info(f"Documenting {len(categories)} categories")
        
        categories_md = self._create_categories_markdown(categories)
        categories_file = self.docs_dir / 'CATEGORIES.md'
        
        with open(categories_file, 'w', encoding='utf-8') as f:
            f.write(categories_md)
        
        # Save as JSON
        categories_json = self.docs_dir / 'categories.json'
        with open(categories_json, 'w', encoding='utf-8') as f:
            json.dump(categories, f, indent=2)
        
        logger.info("Categories documentation created")
    
    def document_tags(self, tags: List[Dict[str, Any]]) -> None:
        """
        Document all tags
        
        Args:
            tags: List of tag information
        """
        if not tags:
            logger.warning("No tags to document")
            return
        
        logger.info(f"Documenting {len(tags)} tags")
        
        tags_md = self._create_tags_markdown(tags)
        tags_file = self.docs_dir / 'TAGS.md'
        
        with open(tags_file, 'w', encoding='utf-8') as f:
            f.write(tags_md)
        
        # Save as JSON
        tags_json = self.docs_dir / 'tags.json'
        with open(tags_json, 'w', encoding='utf-8') as f:
            json.dump(tags, f, indent=2)
        
        logger.info("Tags documentation created")
    
    def document_site_info(self, site_info: Dict[str, Any], 
                          theme_info: Dict[str, Any]) -> None:
        """
        Document site information and configuration
        
        Args:
            site_info: WordPress site information
            theme_info: Active theme information
        """
        logger.info("Documenting site information")
        
        site_md = self._create_site_info_markdown(site_info, theme_info)
        site_file = self.docs_dir / 'SITE_INFO.md'
        
        with open(site_file, 'w', encoding='utf-8') as f:
            f.write(site_md)
        
        # Save as JSON
        combined_info = {
            'site': site_info,
            'theme': theme_info,
            'documented_at': datetime.now().isoformat()
        }
        
        info_json = self.docs_dir / 'site_info.json'
        with open(info_json, 'w', encoding='utf-8') as f:
            json.dump(combined_info, f, indent=2)
        
        logger.info("Site information documentation created")
    
    def create_migration_summary(self, stats: Dict[str, Any]) -> None:
        """
        Create comprehensive migration summary
        
        Args:
            stats: Migration statistics
        """
        logger.info("Creating migration summary")
        
        summary_md = self._create_summary_markdown(stats)
        summary_file = self.docs_dir / 'MIGRATION_SUMMARY.md'
        
        with open(summary_file, 'w', encoding='utf-8') as f:
            f.write(summary_md)
        
        logger.info("Migration summary created")
    
    def _create_plugins_markdown(self, plugins: List[Dict]) -> str:
        """Create Markdown documentation for plugins"""
        md = "# WordPress Plugins Documentation\n\n"
        md += f"**Total Plugins:** {len(plugins)}\n\n"
        md += f"**Documentation Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        md += "---\n\n"
        
        # Separate active and inactive plugins
        active_plugins = [p for p in plugins if p.get('status') == 'active']
        inactive_plugins = [p for p in plugins if p.get('status') != 'active']
        
        if active_plugins:
            md += f"## Active Plugins ({len(active_plugins)})\n\n"
            for plugin in sorted(active_plugins, key=lambda x: x.get('name', '')):
                md += self._format_plugin(plugin)
        
        if inactive_plugins:
            md += f"\n## Inactive Plugins ({len(inactive_plugins)})\n\n"
            for plugin in sorted(inactive_plugins, key=lambda x: x.get('name', '')):
                md += self._format_plugin(plugin)
        
        md += "\n---\n\n"
        md += "## Plugin Configuration Notes\n\n"
        md += "**Important:** Plugin configurations are typically stored in the WordPress database.\n\n"
        md += "To preserve plugin settings:\n"
        md += "1. Export settings if the plugin provides an export feature\n"
        md += "2. Document custom configurations manually\n"
        md += "3. Take screenshots of important plugin settings\n"
        md += "4. Backup the WordPress database for complete settings preservation\n\n"
        
        return md
    
    def _format_plugin(self, plugin: Dict) -> str:
        """Format a single plugin entry"""
        md = f"### {plugin.get('name', 'Unknown Plugin')}\n\n"
        
        details = []
        if 'version' in plugin:
            details.append(f"**Version:** {plugin['version']}")
        if 'status' in plugin:
            details.append(f"**Status:** {plugin['status']}")
        if 'author' in plugin:
            details.append(f"**Author:** {plugin['author']}")
        if 'plugin_uri' in plugin:
            details.append(f"**URL:** {plugin['plugin_uri']}")
        if 'description' in plugin:
            details.append(f"**Description:** {plugin['description']}")
        
        md += " | ".join(details) + "\n\n"
        
        if 'requires_wp' in plugin or 'requires_php' in plugin:
            md += "**Requirements:**\n"
            if 'requires_wp' in plugin:
                md += f"- WordPress: {plugin['requires_wp']}+\n"
            if 'requires_php' in plugin:
                md += f"- PHP: {plugin['requires_php']}+\n"
            md += "\n"
        
        return md
    
    def _create_categories_markdown(self, categories: List[Dict]) -> str:
        """Create Markdown documentation for categories"""
        md = "# WordPress Categories\n\n"
        md += f"**Total Categories:** {len(categories)}\n\n"
        md += f"**Documentation Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        md += "---\n\n"
        
        # Build category hierarchy
        category_tree = self._build_category_tree(categories)
        
        md += "## Category Hierarchy\n\n"
        md += self._format_category_tree(category_tree, categories)
        
        md += "\n## All Categories (Alphabetical)\n\n"
        md += "| Name | Slug | Count | Description |\n"
        md += "|------|------|-------|-------------|\n"
        
        for cat in sorted(categories, key=lambda x: x.get('name', '')):
            name = cat.get('name', 'N/A')
            slug = cat.get('slug', 'N/A')
            count = cat.get('count', 0)
            desc = cat.get('description', '').strip() or 'No description'
            # Truncate long descriptions
            if len(desc) > 100:
                desc = desc[:97] + "..."
            md += f"| {name} | `{slug}` | {count} | {desc} |\n"
        
        return md
    
    def _build_category_tree(self, categories: List[Dict]) -> Dict:
        """Build hierarchical category tree"""
        tree = {}
        for cat in categories:
            if cat.get('parent', 0) == 0:
                tree[cat['id']] = {
                    'info': cat,
                    'children': []
                }
        
        # Add children
        for cat in categories:
            parent_id = cat.get('parent', 0)
            if parent_id != 0 and parent_id in tree:
                tree[parent_id]['children'].append(cat)
        
        return tree
    
    def _format_category_tree(self, tree: Dict, all_cats: List[Dict], 
                             level: int = 0) -> str:
        """Format category tree as Markdown"""
        md = ""
        for cat_id, data in tree.items():
            cat = data['info']
            indent = "  " * level
            md += f"{indent}- **{cat.get('name')}** (`{cat.get('slug')}`) - {cat.get('count', 0)} posts\n"
            
            # Add children
            for child in data.get('children', []):
                child_indent = "  " * (level + 1)
                md += f"{child_indent}- {child.get('name')} (`{child.get('slug')}`) - {child.get('count', 0)} posts\n"
        
        return md
    
    def _create_tags_markdown(self, tags: List[Dict]) -> str:
        """Create Markdown documentation for tags"""
        md = "# WordPress Tags\n\n"
        md += f"**Total Tags:** {len(tags)}\n\n"
        md += f"**Documentation Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        md += "---\n\n"
        
        # Sort tags by count (most used first)
        sorted_tags = sorted(tags, key=lambda x: x.get('count', 0), reverse=True)
        
        md += "## Most Used Tags\n\n"
        top_tags = sorted_tags[:20]  # Top 20
        for tag in top_tags:
            md += f"- **{tag.get('name')}** - {tag.get('count', 0)} posts\n"
        
        md += "\n## All Tags (Alphabetical)\n\n"
        md += "| Name | Slug | Count | Description |\n"
        md += "|------|------|-------|-------------|\n"
        
        for tag in sorted(tags, key=lambda x: x.get('name', '')):
            name = tag.get('name', 'N/A')
            slug = tag.get('slug', 'N/A')
            count = tag.get('count', 0)
            desc = tag.get('description', '').strip() or 'No description'
            if len(desc) > 100:
                desc = desc[:97] + "..."
            md += f"| {tag} | `{slug}` | {count} | {desc} |\n"
        
        md += "\n## Tag Cloud\n\n"
        md += "Tags displayed by frequency:\n\n"
        for tag in sorted_tags:
            count = tag.get('count', 0)
            if count > 10:
                size = "###"
            elif count > 5:
                size = "####"
            else:
                size = "#####"
            md += f"{size} {tag.get('name')} ({count})\n\n"
        
        return md
    
    def _create_site_info_markdown(self, site_info: Dict, theme_info: Dict) -> str:
        """Create Markdown documentation for site info"""
        md = "# WordPress Site Information\n\n"
        md += f"**Documentation Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        md += "---\n\n"
        
        md += "## General Information\n\n"
        if 'name' in site_info:
            md += f"**Site Name:** {site_info['name']}\n\n"
        if 'description' in site_info:
            md += f"**Description:** {site_info['description']}\n\n"
        if 'url' in site_info:
            md += f"**URL:** {site_info['url']}\n\n"
        if 'home' in site_info:
            md += f"**Home URL:** {site_info['home']}\n\n"
        
        md += "## WordPress Version\n\n"
        if 'gmt_offset' in site_info:
            md += f"**GMT Offset:** {site_info['gmt_offset']}\n\n"
        if 'timezone_string' in site_info:
            md += f"**Timezone:** {site_info['timezone_string']}\n\n"
        
        if theme_info:
            md += "## Active Theme\n\n"
            for key, value in theme_info.items():
                md += f"**{key.replace('_', ' ').title()}:** {value}\n\n"
        
        md += "## REST API Information\n\n"
        if 'namespaces' in site_info:
            md += "**Available Namespaces:**\n\n"
            for ns in site_info.get('namespaces', []):
                md += f"- `{ns}`\n"
            md += "\n"
        
        if 'authentication' in site_info:
            md += "**Authentication Methods:**\n\n"
            for auth in site_info.get('authentication', []):
                md += f"- {auth}\n"
            md += "\n"
        
        return md
    
    def _create_summary_markdown(self, stats: Dict) -> str:
        """Create migration summary Markdown"""
        md = "# WordPress to GitHub Migration Summary\n\n"
        md += f"**Migration Completed:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        md += "---\n\n"
        
        md += "## Migration Statistics\n\n"
        md += f"- **Posts Migrated:** {stats.get('posts', 0)}\n"
        md += f"- **Pages Migrated:** {stats.get('pages', 0)}\n"
        md += f"- **Media Files:** {stats.get('media', 0)}\n"
        md += f"- **Categories:** {stats.get('categories', 0)}\n"
        md += f"- **Tags:** {stats.get('tags', 0)}\n"
        md += f"- **Plugins Documented:** {stats.get('plugins', 0)}\n\n"
        
        if 'repository' in stats:
            md += f"**GitHub Repository:** {stats['repository']}\n\n"
        
        md += "## Documentation Files\n\n"
        md += "This migration includes comprehensive documentation:\n\n"
        md += "- `PLUGINS.md` - Complete list of installed plugins\n"
        md += "- `CATEGORIES.md` - Category hierarchy and usage\n"
        md += "- `TAGS.md` - Tag cloud and statistics\n"
        md += "- `SITE_INFO.md` - WordPress configuration details\n"
        md += "- JSON files for programmatic access to all data\n\n"
        
        return md