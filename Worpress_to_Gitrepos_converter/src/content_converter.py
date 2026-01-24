"""
Content Converter - Converts WordPress content to Markdown format
Handles HTML to Markdown conversion and front matter generation
"""

import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from html import unescape
import frontmatter
from markdownify import markdownify as md
from slugify import slugify
from loguru import logger

class ContentConverter:
    """Converts WordPress content to Markdown with front matter"""
    
    def __init__(self, markdown_flavor: str = 'github',
                 preserve_dates: bool = True,
                 date_format: str = '%Y-%m-%d',
                 use_slug_in_filename: bool = True):
        """
        Initialize ContentConverter
        
        Args:
            markdown_flavor: Markdown flavor (github, jekyll, hugo)
            preserve_dates: Use original post dates
            date_format: Date format for filenames
            use_slug_in_filename: Include slug in filename
        """
        self.markdown_flavor = markdown_flavor
        self.preserve_dates = preserve_dates
        self.date_format = date_format
        self.use_slug_in_filename = use_slug_in_filename
    
    def convert_post(self, post: Dict[str, Any], custom_frontmatter: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Convert WordPress post to Markdown
        
        Args:
            post: WordPress post data
            custom_frontmatter: Additional front matter fields
            
        Returns:
            Dictionary with 'filename', 'content', and 'metadata'
        """
        # Extract content
        title = self._clean_text(post.get('title', {}).get('rendered', 'Untitled'))
        content_html = post.get('content', {}).get('rendered', '')
        excerpt_html = post.get('excerpt', {}).get('rendered', '')
        
        # Convert HTML to Markdown
        content_md = self._html_to_markdown(content_html)
        excerpt_md = self._html_to_markdown(excerpt_html) if excerpt_html else ''
        
        # Extract metadata
        metadata = self._extract_metadata(post)
        
        # Add custom front matter if provided
        if custom_frontmatter:
            metadata.update(custom_frontmatter)
        
        # Add excerpt if available
        if excerpt_md:
            metadata['excerpt'] = excerpt_md.strip()
        
        # Create front matter
        front_matter = self._create_frontmatter(metadata)
        
        # Combine front matter and content
        full_content = f"{front_matter}\n\n{content_md}"
        
        # Generate filename
        date_str = self._format_date(post.get('date', ''))
        slug = post.get('slug', slugify(title))
        filename = self._generate_filename(title, slug, date_str, 'post')
        
        return {
            'filename': filename,
            'content': full_content,
            'metadata': metadata
        }
    
    def convert_page(self, page: Dict[str, Any], custom_frontmatter: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Convert WordPress page to Markdown
        
        Args:
            page: WordPress page data
            custom_frontmatter: Additional front matter fields
            
        Returns:
            Dictionary with 'filename', 'content', and 'metadata'
        """
        # Extract content
        title = self._clean_text(page.get('title', {}).get('rendered', 'Untitled'))
        content_html = page.get('content', {}).get('rendered', '')
        
        # Convert HTML to Markdown
        content_md = self._html_to_markdown(content_html)
        
        # Extract metadata
        metadata = self._extract_metadata(page, is_page=True)
        
        # Add custom front matter if provided
        if custom_frontmatter:
            metadata.update(custom_frontmatter)
        
        # Create front matter
        front_matter = self._create_frontmatter(metadata)
        
        # Combine front matter and content
        full_content = f"{front_matter}\n\n{content_md}"
        
        # Generate filename
        slug = page.get('slug', slugify(title))
        filename = f"{slug}.md"
        
        return {
            'filename': filename,
            'content': full_content,
            'metadata': metadata
        }
    
    def _extract_metadata(self, item: Dict[str, Any], is_page: bool = False) -> Dict[str, Any]:
        """Extract metadata from WordPress item"""
        metadata = {}
        
        # Title
        title = self._clean_text(item.get('title', {}).get('rendered', 'Untitled'))
        metadata['title'] = title
        
        # Date
        if not is_page:
            date = item.get('date', '')
            if date:
                metadata['date'] = self._parse_date(date)
            
            modified = item.get('modified', '')
            if modified:
                metadata['modified'] = self._parse_date(modified)
        
        # Author
        author_info = self._extract_author(item)
        if author_info:
            metadata['author'] = author_info
        
        # Categories (posts only)
        if not is_page:
            categories = self._extract_categories(item)
            if categories:
                metadata['categories'] = categories
            
            # Tags
            tags = self._extract_tags(item)
            if tags:
                metadata['tags'] = tags
        
        # Featured image
        featured_image = self._extract_featured_image(item)
        if featured_image:
            metadata['featured_image'] = featured_image
        
        # Status
        metadata['status'] = item.get('status', 'publish')
        
        # Slug
        metadata['slug'] = item.get('slug', '')
        
        # WordPress ID
        metadata['wordpress_id'] = item.get('id', 0)
        
        # Layout based on flavor
        if self.markdown_flavor == 'jekyll':
            metadata['layout'] = 'page' if is_page else 'post'
        
        return metadata
    
    def _extract_author(self, item: Dict[str, Any]) -> Optional[str]:
        """Extract author information"""
        try:
            embedded = item.get('_embedded', {})
            authors = embedded.get('author', [])
            if authors:
                author = authors[0]
                return author.get('name', '')
        except (KeyError, IndexError):
            pass
        return None
    
    def _extract_categories(self, item: Dict[str, Any]) -> List[str]:
        """Extract categories"""
        try:
            embedded = item.get('_embedded', {})
            wp_terms = embedded.get('wp:term', [])
            for term_group in wp_terms:
                if isinstance(term_group, list):
                    for term in term_group:
                        if term.get('taxonomy') == 'category':
                            return [t.get('name', '') for t in term_group 
                                   if t.get('taxonomy') == 'category']
        except (KeyError, IndexError):
            pass
        return []
    
    def _extract_tags(self, item: Dict[str, Any]) -> List[str]:
        """Extract tags"""
        try:
            embedded = item.get('_embedded', {})
            wp_terms = embedded.get('wp:term', [])
            for term_group in wp_terms:
                if isinstance(term_group, list):
                    for term in term_group:
                        if term.get('taxonomy') == 'post_tag':
                            return [t.get('name', '') for t in term_group 
                                   if t.get('taxonomy') == 'post_tag']
        except (KeyError, IndexError):
            pass
        return []
    
    def _extract_featured_image(self, item: Dict[str, Any]) -> Optional[str]:
        """Extract featured image URL"""
        try:
            embedded = item.get('_embedded', {})
            featured_media = embedded.get('wp:featuredmedia', [])
            if featured_media:
                media = featured_media[0]
                return media.get('source_url', '')
        except (KeyError, IndexError):
            pass
        return None
    
    def _html_to_markdown(self, html: str) -> str:
        """Convert HTML to Markdown"""
        if not html:
            return ''
        
        # Unescape HTML entities
        html = unescape(html)
        
        # Convert to Markdown
        markdown = md(
            html,
            heading_style='ATX',
            bullets='-',
            code_language='',
            strip=['script', 'style']
        )
        
        # Clean up extra whitespace
        markdown = re.sub(r'\n{3,}', '\n\n', markdown)
        markdown = markdown.strip()
        
        return markdown
    
    def _clean_text(self, text: str) -> str:
        """Clean text by removing HTML and extra whitespace"""
        if not text:
            return ''
        text = unescape(text)
        text = re.sub(r'<[^>]+>', '', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    def _parse_date(self, date_str: str) -> str:
        """Parse WordPress date string"""
        try:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return dt.strftime('%Y-%m-%d %H:%M:%S')
        except Exception:
            return date_str
    
    def _format_date(self, date_str: str) -> str:
        """Format date for filename"""
        try:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return dt.strftime(self.date_format)
        except Exception:
            return datetime.now().strftime(self.date_format)
    
    def _generate_filename(self, title: str, slug: str, date_str: str, 
                          content_type: str = 'post') -> str:
        """Generate filename for content"""
        if self.use_slug_in_filename and slug:
            base_name = slug
        else:
            base_name = slugify(title)
        
        # Add date prefix for posts if preserving dates
        if content_type == 'post' and self.preserve_dates and date_str:
            filename = f"{date_str}-{base_name}.md"
        else:
            filename = f"{base_name}.md"
        
        return filename
    
    def _create_frontmatter(self, metadata: Dict[str, Any]) -> str:
        """Create YAML front matter"""
        post = frontmatter.Post('', **metadata)
        
        # Convert to string with front matter
        content_with_fm = frontmatter.dumps(post)
        
        # Extract just the front matter part
        lines = content_with_fm.split('\n')
        front_matter_lines = []
        in_frontmatter = False
        
        for line in lines:
            if line.strip() == '---':
                if not in_frontmatter:
                    in_frontmatter = True
                    front_matter_lines.append(line)
                else:
                    front_matter_lines.append(line)
                    break
            elif in_frontmatter:
                front_matter_lines.append(line)
        
        return '\n'.join(front_matter_lines)
    
    def create_index_page(self, posts: List[Dict[str, Any]], 
                         template: str = 'list') -> str:
        """
        Create index page with list of posts
        
        Args:
            posts: List of post metadata
            template: Template style (list, grid, timeline)
            
        Returns:
            Markdown content for index page
        """
        content = "---\n"
        content += "title: Blog Posts\n"
        content += "layout: page\n"
        content += "---\n\n"
        content += "# All Posts\n\n"
        
        # Sort posts by date (newest first)
        sorted_posts = sorted(
            posts,
            key=lambda x: x.get('date', ''),
            reverse=True
        )
        
        if template == 'list':
            for post in sorted_posts:
                title = post.get('title', 'Untitled')
                slug = post.get('slug', '')
                date = post.get('date', '')
                excerpt = post.get('excerpt', '')
                
                content += f"## [{title}]({slug}.md)\n\n"
                if date:
                    content += f"*Published: {date}*\n\n"
                if excerpt:
                    content += f"{excerpt}\n\n"
                content += "---\n\n"
        
        return content