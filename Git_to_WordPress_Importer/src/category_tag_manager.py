"""Category and tag management for WordPress"""

from typing import Dict, Any, List, Optional
import requests

class CategoryTagManager:
    """Manage WordPress categories and tags"""
    
    def __init__(self, site_url: str, username: str, app_password: str):
        """Initialize category/tag manager
        
        Args:
            site_url: WordPress site URL
            username: WordPress username
            app_password: Application password
        """
        self.site_url = site_url.rstrip('/')
        self.api_url = f"{self.site_url}/wp-json/wp/v2"
        self.auth = (username, app_password)
        
        # Cache for categories and tags
        self._category_cache: Dict[str, int] = {}
        self._tag_cache: Dict[str, int] = {}
    
    def get_or_create_category(self, name: str, slug: str = "") -> Optional[int]:
        """Get existing or create new category
        
        Args:
            name: Category name
            slug: Category slug (optional)
            
        Returns:
            Category ID
        """
        # Check cache first
        if name in self._category_cache:
            return self._category_cache[name]
        
        # Check if category exists
        existing = self._find_category_by_name(name)
        if existing:
            self._category_cache[name] = existing['id']
            return existing['id']
        
        # Create new category
        category_id = self.create_category(name, slug)
        if category_id:
            self._category_cache[name] = category_id
        
        return category_id
    
    def create_category(self, name: str, slug: str = "", parent: int = 0, description: str = "") -> Optional[int]:
        """Create new category
        
        Args:
            name: Category name
            slug: Category slug
            parent: Parent category ID
            description: Category description
            
        Returns:
            Category ID if successful
        """
        payload = {
            'name': name,
            'description': description
        }
        
        if slug:
            payload['slug'] = slug
        if parent:
            payload['parent'] = parent
        
        try:
            response = requests.post(
                f"{self.api_url}/categories",
                json=payload,
                auth=self.auth
            )
            
            if response.status_code == 201:
                category_id = response.json()['id']
                print(f"✓ Created category: {name} (ID: {category_id})")
                return category_id
            else:
                print(f"✗ Failed to create category {name}: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"✗ Error creating category: {e}")
            return None
    
    def get_or_create_tag(self, name: str, slug: str = "") -> Optional[int]:
        """Get existing or create new tag
        
        Args:
            name: Tag name
            slug: Tag slug (optional)
            
        Returns:
            Tag ID
        """
        # Check cache first
        if name in self._tag_cache:
            return self._tag_cache[name]
        
        # Check if tag exists
        existing = self._find_tag_by_name(name)
        if existing:
            self._tag_cache[name] = existing['id']
            return existing['id']
        
        # Create new tag
        tag_id = self.create_tag(name, slug)
        if tag_id:
            self._tag_cache[name] = tag_id
        
        return tag_id
    
    def create_tag(self, name: str, slug: str = "", description: str = "") -> Optional[int]:
        """Create new tag
        
        Args:
            name: Tag name
            slug: Tag slug
            description: Tag description
            
        Returns:
            Tag ID if successful
        """
        payload = {
            'name': name,
            'description': description
        }
        
        if slug:
            payload['slug'] = slug
        
        try:
            response = requests.post(
                f"{self.api_url}/tags",
                json=payload,
                auth=self.auth
            )
            
            if response.status_code == 201:
                tag_id = response.json()['id']
                print(f"✓ Created tag: {name} (ID: {tag_id})")
                return tag_id
            else:
                print(f"✗ Failed to create tag {name}: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"✗ Error creating tag: {e}")
            return None
    
    def _find_category_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Find category by name
        
        Args:
            name: Category name
            
        Returns:
            Category data if found
        """
        try:
            response = requests.get(
                f"{self.api_url}/categories",
                params={'search': name, 'per_page': 100},
                auth=self.auth
            )
            
            if response.status_code == 200:
                categories = response.json()
                for cat in categories:
                    if cat['name'].lower() == name.lower():
                        return cat
            
            return None
            
        except Exception:
            return None
    
    def _find_tag_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Find tag by name
        
        Args:
            name: Tag name
            
        Returns:
            Tag data if found
        """
        try:
            response = requests.get(
                f"{self.api_url}/tags",
                params={'search': name, 'per_page': 100},
                auth=self.auth
            )
            
            if response.status_code == 200:
                tags = response.json()
                for tag in tags:
                    if tag['name'].lower() == name.lower():
                        return tag
            
            return None
            
        except Exception:
            return None
    
    def process_categories(self, category_names: List[str]) -> List[int]:
        """Process list of category names and return IDs
        
        Args:
            category_names: List of category names
            
        Returns:
            List of category IDs
        """
        category_ids = []
        
        for name in category_names:
            if name:
                cat_id = self.get_or_create_category(name)
                if cat_id:
                    category_ids.append(cat_id)
        
        return category_ids
    
    def process_tags(self, tag_names: List[str]) -> List[int]:
        """Process list of tag names and return IDs
        
        Args:
            tag_names: List of tag names
            
        Returns:
            List of tag IDs
        """
        tag_ids = []
        
        for name in tag_names:
            if name:
                tag_id = self.get_or_create_tag(name)
                if tag_id:
                    tag_ids.append(tag_id)
        
        return tag_ids