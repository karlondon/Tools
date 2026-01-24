"""WordPress content writer via REST API"""

import base64
from typing import Dict, Any, Optional, List
import requests
from datetime import datetime

class WordPressWriter:
    """Create and update WordPress content via REST API"""
    
    def __init__(self, site_url: str, username: str, app_password: str):
        """Initialize WordPress client
        
        Args:
            site_url: WordPress site URL
            username: WordPress username
            app_password: Application password for authentication
        """
        self.site_url = site_url.rstrip('/')
        self.api_url = f"{self.site_url}/wp-json/wp/v2"
        self.username = username
        self.app_password = app_password
        
        # Create authentication header
        credentials = f"{username}:{app_password}"
        token = base64.b64encode(credentials.encode()).decode('utf-8')
        self.headers = {
            'Authorization': f'Basic {token}',
            'Content-Type': 'application/json'
        }
    
    def test_connection(self) -> bool:
        """Test WordPress connection
        
        Returns:
            True if connection successful
        """
        try:
            response = requests.get(f"{self.api_url}/users/me", headers=self.headers)
            return response.status_code == 200
        except Exception as e:
            print(f"Connection test failed: {e}")
            return False
    
    def create_post(self, post_data: Dict[str, Any]) -> Optional[int]:
        """Create new WordPress post
        
        Args:
            post_data: Post data dictionary
            
        Returns:
            Post ID if successful, None otherwise
        """
        payload = self._prepare_post_payload(post_data)
        
        try:
            response = requests.post(
                f"{self.api_url}/posts",
                json=payload,
                headers=self.headers
            )
            
            if response.status_code == 201:
                post_id = response.json()['id']
                print(f"✓ Created post: {post_data.get('title')} (ID: {post_id})")
                return post_id
            else:
                print(f"✗ Failed to create post: {response.status_code}")
                print(f"  Error: {response.text}")
                return None
                
        except Exception as e:
            print(f"✗ Error creating post: {e}")
            return None
    
    def update_post(self, post_id: int, post_data: Dict[str, Any]) -> bool:
        """Update existing WordPress post
        
        Args:
            post_id: WordPress post ID
            post_data: Post data dictionary
            
        Returns:
            True if successful
        """
        payload = self._prepare_post_payload(post_data)
        
        try:
            response = requests.post(
                f"{self.api_url}/posts/{post_id}",
                json=payload,
                headers=self.headers
            )
            
            if response.status_code == 200:
                print(f"✓ Updated post ID {post_id}")
                return True
            else:
                print(f"✗ Failed to update post: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"✗ Error updating post: {e}")
            return False
    
    def create_page(self, page_data: Dict[str, Any]) -> Optional[int]:
        """Create new WordPress page
        
        Args:
            page_data: Page data dictionary
            
        Returns:
            Page ID if successful, None otherwise
        """
        payload = self._prepare_post_payload(page_data)
        
        try:
            response = requests.post(
                f"{self.api_url}/pages",
                json=payload,
                headers=self.headers
            )
            
            if response.status_code == 201:
                page_id = response.json()['id']
                print(f"✓ Created page: {page_data.get('title')} (ID: {page_id})")
                return page_id
            else:
                print(f"✗ Failed to create page: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"✗ Error creating page: {e}")
            return None
    
    def get_post_by_slug(self, slug: str) -> Optional[Dict[str, Any]]:
        """Find post by slug
        
        Args:
            slug: Post slug
            
        Returns:
            Post data if found
        """
        try:
            response = requests.get(
                f"{self.api_url}/posts",
                params={'slug': slug},
                headers=self.headers
            )
            
            if response.status_code == 200:
                posts = response.json()
                return posts[0] if posts else None
            
            return None
            
        except Exception as e:
            print(f"Error finding post by slug: {e}")
            return None
    
    def set_featured_image(self, post_id: int, media_id: int) -> bool:
        """Set post featured image
        
        Args:
            post_id: Post ID
            media_id: Media ID
            
        Returns:
            True if successful
        """
        try:
            response = requests.post(
                f"{self.api_url}/posts/{post_id}",
                json={'featured_media': media_id},
                headers=self.headers
            )
            
            if response.status_code == 200:
                print(f"✓ Set featured image for post {post_id}")
                return True
            else:
                print(f"✗ Failed to set featured image: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"✗ Error setting featured image: {e}")
            return False
    
    def _prepare_post_payload(self, post_data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare post payload for WordPress API
        
        Args:
            post_data: Post data dictionary
            
        Returns:
            API payload
        """
        payload = {
            'title': post_data.get('title', 'Untitled'),
            'content': post_data.get('content_html', ''),
            'status': post_data.get('status', 'publish'),
            'slug': post_data.get('slug', '')
        }
        
        # Add date if provided
        if post_data.get('date'):
            date = post_data['date']
            if isinstance(date, datetime):
                payload['date'] = date.isoformat()
        
        # Add excerpt if provided
        if post_data.get('excerpt'):
            payload['excerpt'] = post_data['excerpt']
        
        # Add categories if provided
        if post_data.get('category_ids'):
            payload['categories'] = post_data['category_ids']
        
        # Add tags if provided
        if post_data.get('tag_ids'):
            payload['tags'] = post_data['tag_ids']
        
        # Add featured media if provided
        if post_data.get('featured_media_id'):
            payload['featured_media'] = post_data['featured_media_id']
        
        return payload
    
    def get_categories(self) -> List[Dict[str, Any]]:
        """Get all categories
        
        Returns:
            List of categories
        """
        try:
            response = requests.get(
                f"{self.api_url}/categories",
                params={'per_page': 100},
                headers=self.headers
            )
            
            if response.status_code == 200:
                return response.json()
            
            return []
            
        except Exception as e:
            print(f"Error fetching categories: {e}")
            return []
    
    def get_tags(self) -> List[Dict[str, Any]]:
        """Get all tags
        
        Returns:
            List of tags
        """
        try:
            response = requests.get(
                f"{self.api_url}/tags",
                params={'per_page': 100},
                headers=self.headers
            )
            
            if response.status_code == 200:
                return response.json()
            
            return []
            
        except Exception as e:
            print(f"Error fetching tags: {e}")
            return []