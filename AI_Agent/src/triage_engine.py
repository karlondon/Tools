"""
Triage Engine for Ticket Assignment
Automatically assigns tickets to appropriate assignment groups based on ticket content.
Supports dynamic rule loading from YAML configuration file.
"""

import re
import yaml
import os
import logging
from typing import Dict, Optional, Any, List
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class TriageRule:
    """Represents a single triage rule."""
    
    def __init__(self, keyword: str, assignment_group: str, priority: int, description: str = ""):
        """
        Initialize a triage rule.
        
        Args:
            keyword: Keyword to search for
            assignment_group: Assignment group to assign tickets to
            priority: Rule priority (lower = higher priority)
            description: Rule description
        """
        self.keyword = keyword.lower()
        self.assignment_group = assignment_group
        self.priority = priority
        self.description = description
    
    def __repr__(self):
        return f"TriageRule(keyword='{self.keyword}', group='{self.assignment_group}', priority={self.priority})"

class TriageEngine:
    """
    Engine to triage and assign tickets based on configurable rules.
    Loads rules from YAML configuration file for easy maintenance.
    """
    
    def __init__(self, rules_file: Optional[str] = None):
        """
        Initialize the Triage Engine.
        
        Args:
            rules_file: Path to YAML rules file (optional)
                       If not provided, uses default location
        """
        self.rules_file = rules_file or self._get_default_rules_path()
        self.rules: List[TriageRule] = []
        self.settings: Dict[str, Any] = {}
        self.searchable_fields: List[str] = []
        
        # Load rules from YAML file
        self._load_rules_from_yaml()
        
        logger.info(f"TriageEngine initialized with {len(self.rules)} rule(s)")
    
    def _get_default_rules_path(self) -> str:
        """
        Get default path to rules file.
        
        Returns:
            Path to triage_rules.yaml
        """
        # Get the directory of the current file
        current_dir = Path(__file__).parent
        # Go up one level and into config directory
        rules_path = current_dir.parent / 'config' / 'triage_rules.yaml'
        return str(rules_path)
    
    def _load_rules_from_yaml(self):
        """Load triage rules from YAML configuration file."""
        try:
            if not os.path.exists(self.rules_file):
                logger.warning(f"Rules file not found: {self.rules_file}")
                logger.info("Using fallback hardcoded rules")
                self._load_fallback_rules()
                return
            
            with open(self.rules_file, 'r') as f:
                config = yaml.safe_load(f)
            
            if not config:
                logger.error("Empty or invalid YAML file")
                self._load_fallback_rules()
                return
            
            # Load settings
            self.settings = config.get('settings', {})
            self.searchable_fields = self.settings.get('searchable_fields', [
                'short_description', 'description', 'summary',
                'comments', 'work_notes', 'close_notes',
                'title', 'details', 'additional_comments'
            ])
            
            # Check if rules are enabled
            if not self.settings.get('enabled', True):
                logger.warning("Rule processing is disabled in configuration")
                return
            
            # Load rules
            rules_data = config.get('rules', [])
            
            if not rules_data:
                logger.warning("No rules found in configuration file")
                self._load_fallback_rules()
                return
            
            # Parse rules
            for rule_data in rules_data:
                keyword = rule_data.get('keyword')
                assignment_group = rule_data.get('assignment_group')
                priority = rule_data.get('priority', 999)
                description = rule_data.get('description', '')
                
                if keyword and assignment_group:
                    rule = TriageRule(keyword, assignment_group, priority, description)
                    self.rules.append(rule)
                    logger.debug(f"Loaded rule: {rule}")
                else:
                    logger.warning(f"Invalid rule in configuration: {rule_data}")
            
            # Sort rules by priority (lower priority value = higher precedence)
            self.rules.sort(key=lambda r: r.priority)
            
            logger.info(f"Successfully loaded {len(self.rules)} rule(s) from {self.rules_file}")
            
        except yaml.YAMLError as e:
            logger.error(f"YAML parsing error: {str(e)}")
            self._load_fallback_rules()
        except Exception as e:
            logger.error(f"Error loading rules: {str(e)}")
            self._load_fallback_rules()
    
    def _load_fallback_rules(self):
        """Load hardcoded fallback rules if YAML file is unavailable."""
        logger.info("Loading fallback rules")
        
        self.rules = [
            TriageRule('ppl', 'Cloud Managed Services', 1, 'PPL cloud resources'),
            TriageRule('odeon', 'Odeon Engineers', 2, 'Odeon platform systems')
        ]
        
        self.searchable_fields = [
            'short_description', 'description', 'summary',
            'comments', 'work_notes', 'close_notes',
            'title', 'details', 'additional_comments'
        ]
        
        self.settings = {
            'enabled': True,
            'case_sensitive': False,
            'word_boundaries': True,
            'log_matches': True
        }
    
    def reload_rules(self):
        """Reload rules from YAML file (useful for runtime updates)."""
        logger.info("Reloading rules from configuration file")
        self.rules = []
        self._load_rules_from_yaml()
    
    def analyze_ticket(self, ticket_data: Dict[str, Any]) -> Optional[str]:
        """
        Analyze ticket or event details and determine assignment group.
        
        Args:
            ticket_data: Dictionary containing ticket information
                Expected keys: 'short_description', 'description', 'summary', etc.
        
        Returns:
            Assignment group name or None if no match found
        """
        if not ticket_data:
            return None
        
        # Collect all text fields to search
        text_fields = self._extract_text_fields(ticket_data)
        combined_text = ' '.join(text_fields).lower()
        
        # Check each rule in priority order
        for rule in self.rules:
            if self._contains_keyword(combined_text, rule.keyword):
                if self.settings.get('log_matches', True):
                    logger.info(f"Matched rule: {rule}")
                return rule.assignment_group
        
        return None
    
    def _extract_text_fields(self, ticket_data: Dict[str, Any]) -> List[str]:
        """
        Extract all relevant text fields from ticket data.
        
        Args:
            ticket_data: Dictionary containing ticket information
        
        Returns:
            List of text values to search
        """
        text_fields = []
        
        for field in self.searchable_fields:
            if field in ticket_data and ticket_data[field]:
                text_fields.append(str(ticket_data[field]))
        
        return text_fields
    
    def _contains_keyword(self, text: str, keyword: str) -> bool:
        """
        Check if text contains the specified keyword.
        
        Args:
            text: Text to search in
            keyword: Keyword to search for
        
        Returns:
            True if keyword is found, False otherwise
        """
        # Check if word boundaries should be used
        use_word_boundaries = self.settings.get('word_boundaries', True)
        
        if use_word_boundaries:
            # Use word boundary to match whole words
            pattern = r'\b' + re.escape(keyword.lower()) + r'\b'
        else:
            # Match anywhere in text
            pattern = re.escape(keyword.lower())
        
        return bool(re.search(pattern, text, re.IGNORECASE))
    
    def assign_ticket(self, ticket_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze ticket and return assignment recommendation.
        
        Args:
            ticket_data: Dictionary containing ticket information
        
        Returns:
            Dictionary with assignment details:
            {
                'assignment_group': str or None,
                'reason': str,
                'confidence': str,
                'matched_keyword': str or None
            }
        """
        assignment_group = self.analyze_ticket(ticket_data)
        
        result = {
            'assignment_group': assignment_group,
            'reason': None,
            'confidence': 'high',
            'matched_keyword': None
        }
        
        if assignment_group:
            # Find which rule matched
            text_fields = self._extract_text_fields(ticket_data)
            combined_text = ' '.join(text_fields).lower()
            
            for rule in self.rules:
                if self._contains_keyword(combined_text, rule.keyword):
                    result['reason'] = f'Ticket contains mention of "{rule.keyword.upper()}"'
                    result['matched_keyword'] = rule.keyword
                    result['rule_description'] = rule.description
                    break
        else:
            result['reason'] = 'No matching keywords found'
            result['confidence'] = 'none'
        
        return result
    
    def get_rules_summary(self) -> List[Dict[str, Any]]:
        """
        Get summary of all loaded rules.
        
        Returns:
            List of rule dictionaries
        """
        return [
            {
                'keyword': rule.keyword,
                'assignment_group': rule.assignment_group,
                'priority': rule.priority,
                'description': rule.description
            }
            for rule in self.rules
        ]
    
    def add_rule(self, keyword: str, assignment_group: str, priority: int, description: str = ""):
        """
        Add a new rule dynamically (not persisted to YAML).
        
        Args:
            keyword: Keyword to search for
            assignment_group: Assignment group name
            priority: Rule priority
            description: Rule description
        """
        rule = TriageRule(keyword, assignment_group, priority, description)
        self.rules.append(rule)
        self.rules.sort(key=lambda r: r.priority)
        logger.info(f"Added new rule: {rule}")

def triage_ticket(ticket_data: Dict[str, Any], rules_file: Optional[str] = None) -> Dict[str, Any]:
    """
    Convenience function to triage a single ticket.
    
    Args:
        ticket_data: Dictionary containing ticket information
        rules_file: Optional path to rules file
    
    Returns:
        Assignment recommendation dictionary
    """
    engine = TriageEngine(rules_file)
    return engine.assign_ticket(ticket_data)

# Example usage
if __name__ == "__main__":
    # Test cases
    test_tickets = [
        {
            'short_description': 'PPL cloud access issue',
            'description': 'User cannot access PPL cloud resources'
        },
        {
            'short_description': 'Odeon system down',
            'description': 'The Odeon platform is experiencing downtime'
        },
        {
            'short_description': 'General network issue',
            'description': 'Network connectivity problem in building 5'
        }
    ]
    
    print("Triage Engine Test Results:")
    print("=" * 60)
    
    # Initialize engine (will load from YAML)
    engine = TriageEngine()
    
    # Print loaded rules
    print(f"\nLoaded {len(engine.rules)} rule(s):")
    for rule in engine.rules:
        print(f"  {rule.priority}. {rule.keyword.upper()} → {rule.assignment_group}")
    
    print("\n" + "=" * 60)
    
    # Test tickets
    for i, ticket in enumerate(test_tickets, 1):
        print(f"\nTest Case {i}:")
        print(f"Description: {ticket['short_description']}")
        
        result = engine.assign_ticket(ticket)
        print(f"Assignment Group: {result['assignment_group']}")
        print(f"Reason: {result['reason']}")
        print(f"Confidence: {result['confidence']}")
        if result.get('matched_keyword'):
            print(f"Matched Keyword: {result['matched_keyword']}")
    
    print("\n" + "=" * 60)
    print("Test completed")