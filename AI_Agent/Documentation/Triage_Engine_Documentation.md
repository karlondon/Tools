# Triage Engine Implementation Documentation

**Date:** 23 January 2026  
**Project:** AI Agent - ServiceNow Ticket Triage Automation  
**Module:** `triage_engine.py`

---

## Table of Contents
1. [Overview](#overview)
2. [Business Logic Rules](#business-logic-rules)
3. [Technical Implementation](#technical-implementation)
4. [API Reference](#api-reference)
5. [Usage Examples](#usage-examples)
6. [Test Results](#test-results)
7. [Integration Guide](#integration-guide)
8. [Future Enhancements](#future-enhancements)

---

## Overview

The Triage Engine is an automated ticket classification system that analyzes ServiceNow tickets and routes them to appropriate assignment groups based on keyword detection in ticket content.

### Key Features
- ✅ Case-insensitive keyword matching
- ✅ Word boundary detection to prevent false positives
- ✅ Multi-field ticket scanning
- ✅ Priority-based rule evaluation
- ✅ Detailed assignment recommendations with confidence levels

### File Location
```
AI_Agent/src/triage_engine.py
```

---

## Business Logic Rules

### Rule 1: PPL Detection (Priority 1)
| Property | Value |
|----------|-------|
| **Keyword** | "PPL" (case-insensitive) |
| **Assignment Group** | Cloud Managed Services |
| **Priority** | High (checked first) |
| **Description** | Routes tickets related to PPL cloud resources or services |

**Examples:**
- "PPL cloud access issue" ✅
- "User cannot connect to PPL VPN" ✅
- "PPL database timeout" ✅

### Rule 2: Odeon Detection (Priority 2)
| Property | Value |
|----------|-------|
| **Keyword** | "Odeon" (case-insensitive) |
| **Assignment Group** | Odeon Engineers |
| **Priority** | Standard (checked after PPL) |
| **Description** | Routes tickets related to Odeon platform or systems |

**Examples:**
- "Odeon system down" ✅
- "Cannot access Odeon portal" ✅
- "Odeon performance degradation" ✅

### Default Behavior
- **No Match:** Returns `None` with reason "No matching keywords found"
- **Confidence:** Set to "none" for unmatched tickets
- **Next Steps:** These tickets may require manual triage or additional rules

---

## Technical Implementation

### Architecture

```
TriageEngine
├── __init__()
├── _load_rules()              # Load keyword-to-group mappings
├── analyze_ticket()           # Core analysis logic
├── _extract_text_fields()     # Extract searchable content
├── _contains_keyword()        # Regex-based keyword detection
└── assign_ticket()            # Full assignment recommendation
```

### Keyword Detection Algorithm

The engine uses **regex word boundaries** to ensure accurate matching:

```python
pattern = r'\b' + re.escape(keyword.lower()) + r'\b'
```

**Why Word Boundaries?**
- ✅ Matches "PPL" in "PPL cloud issue"
- ✅ Matches "ppl" in "accessing ppl resources"
- ❌ Does NOT match "ppl" in "apple"
- ❌ Does NOT match "ppl" in "supplier"

### Searchable Ticket Fields

The engine scans the following ServiceNow ticket fields:

```python
searchable_fields = [
    'short_description',    # Primary ticket title
    'description',          # Detailed ticket description
    'summary',              # Ticket summary
    'comments',             # User and support comments
    'work_notes',           # Internal technician notes
    'close_notes',          # Resolution notes
    'title',                # Alternative title field
    'details',              # Additional details
    'additional_comments'   # Supplementary comments
]
```

---

## API Reference

### Class: `TriageEngine`

Main class for ticket triage operations.

#### Constructor

```python
engine = TriageEngine()
```

Initializes the triage engine with predefined rules.

#### Methods

##### `analyze_ticket(ticket_data: Dict[str, Any]) -> Optional[str]`

Analyzes ticket and returns assignment group name.

**Parameters:**
- `ticket_data` (dict): Dictionary containing ticket information

**Returns:**
- `str`: Assignment group name if match found
- `None`: If no matching keywords detected

**Example:**
```python
ticket = {'short_description': 'PPL access issue'}
assignment_group = engine.analyze_ticket(ticket)
# Returns: 'Cloud Managed Services'
```

---

##### `assign_ticket(ticket_data: Dict[str, Any]) -> Dict[str, Any]`

Analyzes ticket and returns detailed assignment recommendation.

**Parameters:**
- `ticket_data` (dict): Dictionary containing ticket information

**Returns:**
```python
{
    'assignment_group': str | None,  # Assignment group name
    'reason': str,                   # Explanation for assignment
    'confidence': str                # 'high' or 'none'
}
```

**Example:**
```python
ticket = {'short_description': 'Odeon down'}
result = engine.assign_ticket(ticket)

# Returns:
# {
#     'assignment_group': 'Odeon Engineers',
#     'reason': 'Ticket contains mention of "Odeon"',
#     'confidence': 'high'
# }
```

---

##### `_extract_text_fields(ticket_data: Dict[str, Any]) -> list`

Extracts all searchable text content from ticket.

**Parameters:**
- `ticket_data` (dict): Ticket data dictionary

**Returns:**
- `list`: List of text strings to search

**Internal Method** - Not typically called directly

---

##### `_contains_keyword(text: str, keyword: str) -> bool`

Checks if text contains keyword using word boundary matching.

**Parameters:**
- `text` (str): Text to search in
- `keyword` (str): Keyword to search for

**Returns:**
- `bool`: True if keyword found, False otherwise

**Internal Method** - Not typically called directly

---

### Function: `triage_ticket(ticket_data: Dict[str, Any]) -> Dict[str, Any]`

Convenience function for quick single-ticket triage.

**Parameters:**
- `ticket_data` (dict): Dictionary containing ticket information

**Returns:**
- `dict`: Assignment recommendation (same as `assign_ticket()`)

**Example:**
```python
from triage_engine import triage_ticket

result = triage_ticket({'description': 'PPL issue'})
```

---

## Usage Examples

### Example 1: Basic PPL Ticket

```python
from triage_engine import TriageEngine

# Initialize engine
engine = TriageEngine()

# Sample PPL ticket
ticket = {
    'short_description': 'PPL cloud access issue',
    'description': 'User cannot access PPL cloud resources in region US-EAST'
}

# Get assignment recommendation
result = engine.assign_ticket(ticket)

print(f"Assignment Group: {result['assignment_group']}")
print(f"Reason: {result['reason']}")
print(f"Confidence: {result['confidence']}")

# Output:
# Assignment Group: Cloud Managed Services
# Reason: Ticket contains mention of "PPL"
# Confidence: high
```

### Example 2: Odeon Platform Ticket

```python
from triage_engine import triage_ticket

# Sample Odeon ticket
ticket = {
    'short_description': 'Odeon system experiencing downtime',
    'description': 'The Odeon platform is not responding to user requests',
    'comments': 'Multiple users reporting 500 errors on Odeon portal'
}

# Use convenience function
result = triage_ticket(ticket)

print(result)

# Output:
# {
#     'assignment_group': 'Odeon Engineers',
#     'reason': 'Ticket contains mention of "Odeon"',
#     'confidence': 'high'
# }
```

### Example 3: Unmatched Ticket

```python
ticket = {
    'short_description': 'General network connectivity issue',
    'description': 'Users in building 5 experiencing intermittent network drops'
}

result = triage_ticket(ticket)

print(result)

# Output:
# {
#     'assignment_group': None,
#     'reason': 'No matching keywords found',
#     'confidence': 'none'
# }
```

### Example 4: Batch Processing

```python
from triage_engine import TriageEngine

# Initialize once for multiple tickets
engine = TriageEngine()

tickets = [
    {'short_description': 'PPL VPN connection failed'},
    {'short_description': 'Odeon portal login issue'},
    {'short_description': 'Printer not working'}
]

# Process multiple tickets
for ticket in tickets:
    result = engine.assign_ticket(ticket)
    print(f"{ticket['short_description']}: {result['assignment_group']}")

# Output:
# PPL VPN connection failed: Cloud Managed Services
# Odeon portal login issue: Odeon Engineers
# Printer not working: None
```

---

## Test Results

### Built-in Test Suite

The module includes automated tests in the `__main__` section:

```bash
cd AI_Agent/src
python3 triage_engine.py
```

**Test Output:**
```
Triage Engine Test Results:
============================================================

Test Case 1:
Description: PPL cloud access issue
Assignment Group: Cloud Managed Services
Reason: Ticket contains mention of "PPL"
Confidence: high

Test Case 2:
Description: Odeon system down
Assignment Group: Odeon Engineers
Reason: Ticket contains mention of "Odeon"
Confidence: high

Test Case 3:
Description: General network issue
Assignment Group: None
Reason: No matching keywords found
Confidence: none
```

### Test Coverage

| Test Case | Keyword | Expected Group | Status |
|-----------|---------|----------------|--------|
| PPL cloud issue | PPL | Cloud Managed Services | ✅ Pass |
| Odeon platform down | Odeon | Odeon Engineers | ✅ Pass |
| Generic network issue | None | None | ✅ Pass |

---

## Integration Guide

### ServiceNow Workflow Integration

```
┌─────────────────┐
│  New Ticket     │
│  Created        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Ticket Monitor  │ ← ticket_monitor.py
│ (Polling/Webhook)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Triage Engine   │ ← triage_engine.py
│ Analyze & Assign│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ServiceNow      │ ← servicenow_client.py
│ Update Ticket   │
└─────────────────┘
```

### Integration Code Example

```python
from servicenow_client import ServiceNowClient
from triage_engine import TriageEngine

# Initialize components
snow = ServiceNowClient()
engine = TriageEngine()

# Get new ticket
ticket = snow.get_ticket('INC0012345')

# Analyze ticket
result = engine.assign_ticket(ticket)

# Update assignment group if match found
if result['assignment_group']:
    snow.update_ticket(
        ticket_number='INC0012345',
        assignment_group=result['assignment_group'],
        work_notes=f"Auto-assigned: {result['reason']}"
    )
```

### Configuration

Assignment groups are defined as class constants:

```python
ASSIGNMENT_GROUPS = {
    'PPL': 'Cloud Managed Services',
    'ODEON': 'Odeon Engineers'
}
```

**To modify assignment groups:**
1. Edit the `ASSIGNMENT_GROUPS` dictionary in `triage_engine.py`
2. Ensure the group names match exactly with ServiceNow
3. Restart the triage service

---

## Future Enhancements

### Planned Features

#### 1. YAML Configuration Support
Move rules to `triage_rules.yaml` for easier management without code changes.

```yaml
rules:
  - keyword: "PPL"
    assignment_group: "Cloud Managed Services"
    priority: 1
  - keyword: "Odeon"
    assignment_group: "Odeon Engineers"
    priority: 2
```

#### 2. Advanced Pattern Matching
Support regex patterns for complex matching scenarios:

```python
patterns = {
    r'(PPL|People.?Plus)': 'Cloud Managed Services',
    r'Odeon\s+(Cinema|Platform|Portal)': 'Odeon Engineers'
}
```

#### 3. Multi-Keyword AND/OR Logic
Support complex conditions:

```python
rules = {
    'AND': ['PPL', 'Cloud', 'Access'],
    'OR': ['Odeon', 'Cinema Portal']
}
```

#### 4. Priority-Based Assignment
Assign ticket priority along with assignment group:

```python
{
    'assignment_group': 'Cloud Managed Services',
    'priority': 'P1',  # Critical
    'urgency': 'High'
}
```

#### 5. Machine Learning Integration
Use ML for tickets that don't match keyword rules:

```python
if not keyword_match:
    ml_prediction = ml_model.predict(ticket_text)
    assignment_group = ml_prediction['group']
    confidence = ml_prediction['confidence']
```

#### 6. Audit Logging
Track all assignment decisions:

```python
logger.info({
    'ticket_id': 'INC0012345',
    'matched_keyword': 'PPL',
    'assignment_group': 'Cloud Managed Services',
    'timestamp': '2026-01-23T19:36:00Z'
})
```

#### 7. Performance Metrics
Track rule effectiveness:

```python
metrics = {
    'total_tickets': 1000,
    'auto_assigned': 850,
    'manual_review': 150,
    'accuracy': 95.5,
    'avg_processing_time_ms': 12
}
```

---

## Maintenance

### Adding New Assignment Rules

**Step 1:** Update `ASSIGNMENT_GROUPS` dictionary
```python
ASSIGNMENT_GROUPS = {
    'PPL': 'Cloud Managed Services',
    'ODEON': 'Odeon Engineers',
    'SAP': 'SAP Support Team'  # New rule
}
```

**Step 2:** Add keyword check in `analyze_ticket()` method
```python
# Check for SAP mention
if self._contains_keyword(combined_text, 'sap'):
    return self.ASSIGNMENT_GROUPS['SAP']
```

**Step 3:** Update `assign_ticket()` method for reason
```python
elif assignment_group == self.ASSIGNMENT_GROUPS['SAP']:
    result['reason'] = 'Ticket contains mention of "SAP"'
```

**Step 4:** Add test case
```python
{
    'short_description': 'SAP system error',
    'description': 'Error in SAP module'
}
```

**Step 5:** Update this documentation

### Testing New Rules

```bash
# Run built-in tests
cd AI_Agent/src
python3 triage_engine.py

# Test specific keyword
python3 -c "from triage_engine import triage_ticket; \
print(triage_ticket({'description': 'SAP issue'}))"
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Keyword Not Detected

**Problem:** Ticket contains keyword but not assigned

**Solution:**
- Check for typos in keyword spelling
- Verify word boundaries (e.g., "PPL" vs "ppl" in "supplier")
- Ensure field is in searchable_fields list

#### Issue 2: False Positives

**Problem:** Tickets incorrectly assigned due to partial matches

**Solution:**
- Word boundary regex already prevents this
- Review specific cases and adjust patterns if needed

#### Issue 3: Multiple Keywords Match

**Problem:** Ticket contains both "PPL" and "Odeon"

**Current Behavior:** PPL takes priority (checked first)

**Alternative:** Implement multi-keyword detection and return multiple possible groups

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-23 | 1.0.0 | Initial implementation with PPL and Odeon rules |

---

## Support

For questions or issues:
1. Check this documentation
2. Review test cases in `__main__` section
3. Examine source code comments
4. Contact: [Your Team Contact Info]

---

**End of Documentation**