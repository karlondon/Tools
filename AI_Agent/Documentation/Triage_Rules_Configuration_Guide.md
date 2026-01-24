# Triage Rules Configuration Guide

**Date:** 23 January 2026  
**Project:** AI Agent - ServiceNow Ticket Triage Automation  
**Configuration File:** `config/triage_rules.yaml`

---

## Table of Contents
1. [Overview](#overview)
2. [Rule Structure](#rule-structure)
3. [Adding New Rules](#adding-new-rules)
4. [Configuration Settings](#configuration-settings)
5. [Examples](#examples)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The triage rules are defined in a YAML configuration file (`config/triage_rules.yaml`) that allows you to easily add, modify, or remove ticket assignment rules without changing any code.

### Key Benefits
- ✅ **No Code Changes**: Add rules by editing YAML file
- ✅ **Priority System**: Control rule evaluation order
- ✅ **Hot Reload**: Reload rules without restarting (using `reload_rules()`)
- ✅ **Documentation**: Each rule includes description and examples
- ✅ **Validation**: Built-in validation for rule syntax
- ✅ **Fallback**: Automatic fallback to hardcoded rules if file unavailable

### File Location
```
AI_Agent/config/triage_rules.yaml
```

---

## Rule Structure

### Basic Rule Format

```yaml
rules:
  - keyword: "KEYWORD"
    assignment_group: "Assignment Group Name"
    priority: 1
    description: "Description of what this rule handles"
    examples:
      - "Example ticket 1"
      - "Example ticket 2"
```

### Rule Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `keyword` | Yes | String | Keyword to search for (case-insensitive) |
| `assignment_group` | Yes | String | ServiceNow assignment group name |
| `priority` | Yes | Integer | Rule evaluation order (lower = higher priority) |
| `description` | No | String | Human-readable description |
| `examples` | No | Array | Example ticket descriptions |

### Current Rules (As Configured)

```yaml
rules:
  # Priority 1: PPL - Cloud Managed Services
  - keyword: "PPL"
    assignment_group: "Cloud Managed Services"
    priority: 1
    description: "Tickets mentioning PPL cloud resources or services"
    
  # Priority 2: Odeon - Odeon Engineers
  - keyword: "Odeon"
    assignment_group: "Odeon Engineers"
    priority: 2
    description: "Tickets related to Odeon platform or systems"
```

---

## Adding New Rules

### Step 1: Open Configuration File

```bash
cd AI_Agent/config
nano triage_rules.yaml  # or use your preferred editor
```

### Step 2: Add New Rule

Add your rule under the `rules:` section:

```yaml
rules:
  # Existing rules...
  
  # New rule: Network Team
  - keyword: "network"
    assignment_group: "Network Operations Team"
    priority: 3
    description: "Network connectivity and infrastructure issues"
    examples:
      - "Network outage in building 5"
      - "Cannot connect to network"
      - "VPN connection failed"
```

### Step 3: Save and Test

```bash
# Test the configuration
cd ../src
python3 triage_engine.py
```

### Step 4: Reload Rules (Optional)

If the engine is already running, you can reload rules without restarting:

```python
from triage_engine import TriageEngine

engine = TriageEngine()
# ... later ...
engine.reload_rules()  # Reloads from YAML file
```

---

## Configuration Settings

The YAML file includes a `settings:` section that controls engine behavior:

```yaml
settings:
  # Enable/disable rule processing
  enabled: true
  
  # Case sensitivity for keyword matching
  case_sensitive: false
  
  # Use word boundaries for keyword matching
  word_boundaries: true
  
  # Fields to search in tickets
  searchable_fields:
    - short_description
    - description
    - summary
    - comments
    - work_notes
    - close_notes
    - title
    - details
    - additional_comments
  
  # Default assignment group if no rules match
  default_assignment_group: null
  
  # Log matches for auditing
  log_matches: true
```

### Setting Descriptions

#### `enabled` (boolean)
- **Default:** `true`
- **Description:** Enable or disable all rule processing
- **Usage:** Set to `false` to temporarily disable automated triage

#### `case_sensitive` (boolean)
- **Default:** `false`
- **Description:** Whether keyword matching is case-sensitive
- **Example:**
  - `false`: "PPL", "ppl", "Ppl" all match
  - `true`: Only exact case matches

#### `word_boundaries` (boolean)
- **Default:** `true`
- **Description:** Use word boundaries for matching
- **Example:**
  - `true`: "PPL" matches "PPL cloud" but NOT "APPLE"
  - `false`: "PPL" matches both "PPL cloud" AND "APPLE"

#### `searchable_fields` (array)
- **Default:** 9 common ServiceNow fields
- **Description:** Which ticket fields to search for keywords
- **Customization:** Add or remove fields based on your needs

#### `default_assignment_group` (string or null)
- **Default:** `null`
- **Description:** Default group if no rules match
- **Usage:** Set to a group name for automatic fallback assignment

#### `log_matches` (boolean)
- **Default:** `true`
- **Description:** Log rule matches for auditing
- **Usage:** Disable for performance in high-volume environments

---

## Examples

### Example 1: Application-Specific Rules

```yaml
rules:
  # SAP Support
  - keyword: "SAP"
    assignment_group: "SAP Support Team"
    priority: 3
    description: "SAP application issues and support requests"
    examples:
      - "SAP system error"
      - "Cannot login to SAP"
      - "SAP module not responding"
  
  # Salesforce Support
  - keyword: "Salesforce"
    assignment_group: "CRM Support Team"
    priority: 4
    description: "Salesforce CRM issues"
    examples:
      - "Salesforce sync error"
      - "Cannot access Salesforce dashboard"
```

### Example 2: Infrastructure Rules

```yaml
rules:
  # Database Issues
  - keyword: "database"
    assignment_group: "Database Administration"
    priority: 5
    description: "Database access, performance, and maintenance"
    examples:
      - "Database connection timeout"
      - "SQL query slow performance"
      - "Database backup failed"
  
  # Server Issues
  - keyword: "server"
    assignment_group: "Server Operations"
    priority: 6
    description: "Server hardware and OS issues"
    examples:
      - "Server not responding"
      - "High CPU usage on server"
```

### Example 3: Security Rules

```yaml
rules:
  # Security Incidents
  - keyword: "security"
    assignment_group: "Security Operations Center"
    priority: 1  # High priority
    description: "Security incidents and threats"
    examples:
      - "Security breach detected"
      - "Suspicious login activity"
      - "Malware detected"
  
  # Access Control
  - keyword: "access"
    assignment_group: "Identity and Access Management"
    priority: 7
    description: "User access and permission issues"
    examples:
      - "Cannot access shared drive"
      - "Need access to application"
```

### Example 4: Priority-Based Rules

```yaml
rules:
  # Critical - Process first
  - keyword: "critical"
    assignment_group: "Critical Incident Response Team"
    priority: 1
    description: "Critical business impact incidents"
  
  # Normal priority
  - keyword: "password"
    assignment_group: "Service Desk"
    priority: 10
    description: "Password reset requests"
```

---

## Best Practices

### 1. Priority Assignment

**Guidelines:**
- Use priority 1-10 for critical/common keywords
- Use priority 11-50 for standard keywords
- Use priority 51+ for low-priority/generic keywords

**Example Priority Scheme:**
```yaml
# 1-10: Critical/Security
- keyword: "security"
  priority: 1

- keyword: "PPL"
  priority: 2

# 11-30: Applications
- keyword: "SAP"
  priority: 11

- keyword: "Salesforce"
  priority: 12

# 31-50: Infrastructure
- keyword: "database"
  priority: 31

- keyword: "network"
  priority: 32

# 51+: Generic
- keyword: "password"
  priority: 51
```

### 2. Keyword Selection

**Good Keywords:**
- Specific: "Odeon", "PPL", "SAP"
- Unique: Avoid common words like "the", "and"
- Meaningful: Tied to specific systems or services

**Avoid:**
- Generic words: "problem", "issue", "help"
- Common words: "user", "system" (unless very specific context)
- Overlapping keywords: "app" and "application" (choose one)

### 3. Testing New Rules

```bash
# Before deploying, test with sample tickets
cd AI_Agent/src
python3 << 'EOF'
from triage_engine import TriageEngine

engine = TriageEngine()

# Test ticket
test_ticket = {
    'short_description': 'Your test description here',
    'description': 'Full test description'
}

result = engine.assign_ticket(test_ticket)
print(f"Assignment: {result['assignment_group']}")
print(f"Reason: {result['reason']}")
EOF
```

### 4. Documentation

Always include:
- Clear description for each rule
- Example tickets that would match
- Comments explaining priority choices

```yaml
# Priority 3: Network Team
# Why priority 3: Common issue but not critical
# Last updated: 2026-01-23
- keyword: "network"
  assignment_group: "Network Operations Team"
  priority: 3
  description: "Network connectivity and infrastructure issues"
  examples:
    - "Network outage in building 5"
    - "Cannot connect to WiFi"
```

### 5. Regular Review

- Review rules quarterly
- Remove unused rules
- Adjust priorities based on ticket volume
- Update assignment groups if they change in ServiceNow

---

## Troubleshooting

### Issue 1: Rules Not Loading

**Symptoms:**
- Engine uses fallback rules
- Log shows "Rules file not found"

**Solutions:**
```bash
# Check file exists
ls -la AI_Agent/config/triage_rules.yaml

# Check file permissions
chmod 644 AI_Agent/config/triage_rules.yaml

# Verify YAML syntax
python3 -c "import yaml; yaml.safe_load(open('AI_Agent/config/triage_rules.yaml'))"
```

### Issue 2: Rule Not Matching

**Symptoms:**
- Ticket contains keyword but doesn't match
- Assigned to wrong group

**Check:**
1. **Word Boundaries:** "PPL" won't match "APPLE" if word_boundaries=true
2. **Case Sensitivity:** Check case_sensitive setting
3. **Priority Order:** Higher priority rule may match first
4. **Searchable Fields:** Keyword might be in unsearched field

**Debug:**
```python
from triage_engine import TriageEngine

engine = TriageEngine()

# Check what fields are being searched
print("Searchable fields:", engine.searchable_fields)

# Check loaded rules
for rule in engine.rules:
    print(rule)

# Test specific ticket
ticket = {'short_description': 'Your ticket text'}
result = engine.assign_ticket(ticket)
print(result)
```

### Issue 3: YAML Syntax Error

**Symptoms:**
- Log shows "YAML parsing error"
- Engine uses fallback rules

**Common Mistakes:**
```yaml
# BAD - Incorrect indentation
rules:
- keyword: "test"
  assignment_group: "Team"
   priority: 1  # Too many spaces

# GOOD - Correct indentation
rules:
  - keyword: "test"
    assignment_group: "Team"
    priority: 1
```

**Validate YAML:**
```bash
# Online validators
# - https://www.yamllint.com/
# - https://codebeautify.org/yaml-validator

# Command line
python3 -m yaml AI_Agent/config/triage_rules.yaml
```

### Issue 4: Multiple Rules Match

**Behavior:**
- First matching rule (by priority) wins
- Lower priority number = evaluated first

**Example:**
```yaml
rules:
  - keyword: "PPL"
    priority: 1  # Checked first
    
  - keyword: "cloud"
    priority: 2  # Checked second

# Ticket: "PPL cloud access issue"
# Result: Matches PPL (priority 1), "cloud" rule never checked
```

---

## Rule Templates

Quick-start templates for common scenarios:

### Application Support Template

```yaml
- keyword: "APPLICATION_NAME"
  assignment_group: "Application Support Team"
  priority: XX
  description: "APPLICATION_NAME application issues"
  examples:
    - "Cannot login to APPLICATION_NAME"
    - "APPLICATION_NAME performance issues"
    - "APPLICATION_NAME error message"
```

### Infrastructure Template

```yaml
- keyword: "INFRASTRUCTURE_TYPE"
  assignment_group: "Infrastructure Team"
  priority: XX
  description: "INFRASTRUCTURE_TYPE related issues"
  examples:
    - "INFRASTRUCTURE_TYPE not responding"
    - "INFRASTRUCTURE_TYPE performance degradation"
```

### Security Template

```yaml
- keyword: "SECURITY_KEYWORD"
  assignment_group: "Security Operations Center"
  priority: 1  # Usually high priority
  description: "Security-related incidents"
  examples:
    - "Security alert for SECURITY_KEYWORD"
    - "Suspicious SECURITY_KEYWORD activity"
```

---

## Validation Rules

The configuration includes validation settings:

```yaml
validation:
  max_rules: 100              # Maximum number of rules
  unique_keywords: true       # Require unique keywords
  unique_priorities: false    # Allow duplicate priorities
  min_keyword_length: 2       # Minimum keyword length
  max_keyword_length: 50      # Maximum keyword length
```

These are informational - actual validation is performed by the TriageEngine.

---

## Change Management

### Version Control

```yaml
metadata:
  version: "1.0"
  last_modified_by: "Your Name"
  last_modified_date: "2026-01-23"
  
  change_history:
    - date: "2026-01-23"
      version: "1.0"
      changes: "Initial implementation with PPL and Odeon rules"
      author: "AI Agent Implementation"
    
    # Add new entries here
    - date: "2026-01-24"
      version: "1.1"
      changes: "Added SAP and Network rules"
      author: "Your Name"
```

### Testing After Changes

```bash
# 1. Backup current rules
cp AI_Agent/config/triage_rules.yaml AI_Agent/config/triage_rules.yaml.backup

# 2. Make changes
nano AI_Agent/config/triage_rules.yaml

# 3. Test with sample tickets
cd AI_Agent/src
python3 triage_engine.py

# 4. If issues, restore backup
cp AI_Agent/config/triage_rules.yaml.backup AI_Agent/config/triage_rules.yaml
```

---

## Complete Example Configuration

Here's a complete example with multiple rules:

```yaml
version: "1.0"
last_updated: "2026-01-23"

rules:
  # Critical Systems (Priority 1-5)
  - keyword: "PPL"
    assignment_group: "Cloud Managed Services"
    priority: 1
    description: "PPL cloud resources and services"
  
  - keyword: "Odeon"
    assignment_group: "Odeon Engineers"
    priority: 2
    description: "Odeon platform systems"
  
  - keyword: "security"
    assignment_group: "Security Operations Center"
    priority: 3
    description: "Security incidents and threats"
  
  # Applications (Priority 10-29)
  - keyword: "SAP"
    assignment_group: "SAP Support Team"
    priority: 10
    description: "SAP application issues"
  
  - keyword: "Salesforce"
    assignment_group: "CRM Support Team"
    priority: 11
    description: "Salesforce CRM issues"
  
  # Infrastructure (Priority 30-49)
  - keyword: "network"
    assignment_group: "Network Operations Team"
    priority: 30
    description: "Network connectivity issues"
  
  - keyword: "database"
    assignment_group: "Database Administration"
    priority: 31
    description: "Database issues"
  
  # General (Priority 50+)
  - keyword: "password"
    assignment_group: "Service Desk"
    priority: 50
    description: "Password reset requests"

settings:
  enabled: true
  case_sensitive: false
  word_boundaries: true
  log_matches: true
  searchable_fields:
    - short_description
    - description
    - summary
    - comments
```

---

## Support

For questions or issues with rule configuration:
1. Check YAML syntax with online validator
2. Review logs for error messages
3. Test rules with `python3 triage_engine.py`
4. Contact: [Your Team Contact Info]

---

**End of Documentation**