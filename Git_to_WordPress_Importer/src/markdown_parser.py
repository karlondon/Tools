"""Markdown parsing with front matter support"""

import re
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
import frontmatter
import markdown
from slugify import slugify

class MarkdownParser:
    """Parse Markdown files with YAML front matter"""
    
    def __init__(self):
        """Initialize Markdown parser"""
        self.md = markdown.Markdown(extensions=[
            'extra',
            'codehilite',
            'tables',
            'fenced_code',
            'toc'
        ])
    
    def parse_file(self, file_path: Path) -> Dict[str, Any]:
        """Parse Markdown file and extract front matter
        
        Args:
            file_path: Path to Markdown file
            
        Returns:
            Dictionary with parsed content and metadata
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            post = frontmatter.load(f)
        
        # Extract metadata from front matter
        metadata = {
            'title': post.get('title', file_path.stem),
            'content_html': self.markdown_to_html(post.content),
            'content_raw': post.content,
            'date': self._parse_date(post.get('date')),
            'categories': self._normalize_list(post.get('categories', [])),
            'tags': self._normalize_list(post.get('tags', [])),
            'author': post.get('author', ''),
            'featured_image': post.get('featured_image', ''),
            'excerpt': post.get('excerpt', ''),
            'status': post.get('status', 'publish'),
            'slug': post.get('slug', slugify(post.get('title', file_path.stem))),
            'file_path': str(file_path)
        }
        
        # Extract media references from content
        metadata['media_references'] = self.extract_media_references(post.content)
        
        return metadata
    
    def markdown_to_html(self, markdown_content: str) -> str:
        """Convert Markdown to HTML
        
        Args:
            markdown_content: Markdown text
            
        Returns:
            HTML content
        """
        # Reset parser state
        self.md.reset()
        return self.md.convert(markdown_content)
    
    def _parse_date(self, date_value: Any) -> Optional[datetime]:
        """Parse date from various formats
        
        Args:
            date_value: Date value from front matter
            
        Returns:
            Datetime object or None
        """
        if isinstance(date_value, datetime):
            return date_value
        
        if isinstance(date_value, str):
            # Try common date formats
            formats = [
                '%Y-%m-%d',
                '%Y-%m-%d %H:%M:%S',
                '%Y-%m-%dT%H:%M:%S',
                '%d/%m/%Y',
                '%m/%d/%Y'
            ]
            
            for fmt in formats:
                try:
                    return datetime.strptime(date_value, fmt)
                except ValueError:
                    continue
        
        return None
    
    def _normalize_list(self, value: Any) -> List[str]:
        """Normalize list values from front matter
        
        Args:
            value: Value from front matter
            
        Returns:
            List of strings
        """
        if isinstance(value, list):
            return [str(item) for item in value]
        elif isinstance(value, str):
            # Handle comma-separated or space-separated values
            return [item.strip() for item in re.split(r'[,\s]+', value) if item.strip()]
        else:
            return []
    
    def extract_media_references(self, content: str) -> List[Dict[str, str]]:
        """Find all media references in Markdown content
        
        Args:
            content: Markdown content
            
        Returns:
            List of media references with type and path
        """
        media_refs = []
        
        # Find Markdown images: ![alt](path)
        image_pattern = r'!\[([^\]]*)\]\(([^\)]+)\)'
        for match in re.finditer(image_pattern, content):
            alt_text = match.group(1)
            path = match.group(2)
            media_refs.append({
                'type': 'image',
                'path': path,
                'alt': alt_text
            })
        
        # Find HTML images: <img src="path">
        html_img_pattern = r'<img[^>]+src=["\']([^"\']+)["\']'
        for match in re.finditer(html_img_pattern, content):
            path = match.group(1)
            media_refs.append({
                'type': 'image',
                'path': path,
                'alt': ''
            })
        
        return media_refs
    
    def get_excerpt(self, content: str, length: int = 200) -> str:
        """Generate excerpt from content
        
        Args:
            content: Full content
            length: Maximum excerpt length
            
        Returns:
            Excerpt text
        """
        # Remove Markdown formatting
        plain_text = re.sub(r'[#*`\[\]()]', '', content)
        plain_text = plain_text.strip()
        
        if len(plain_text) <= length:
            return plain_text
        
        # Truncate at word boundary
        excerpt = plain_text[:length]
        last_space = excerpt.rfind(' ')
        if last_space > 0:
            excerpt = excerpt[:last_space]
        
        return excerpt + '...'