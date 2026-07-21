import openpyxl
import re
from collections import Counter, defaultdict

wb = openpyxl.load_workbook('GCP Tickets.xlsx')
ws = wb['Page 1']

rows = []
for r in range(2, ws.max_row + 1):
    row = {
        'Number': ws.cell(r, 1).value,
        'Priority': ws.cell(r, 2).value,
        'State': ws.cell(r, 3).value,
        'Assignment group': ws.cell(r, 4).value,
        'Assigned to': ws.cell(r, 5).value,
        'Short description': ws.cell(r, 6).value,
        'Task type': ws.cell(r, 7).value,
        'Updated': ws.cell(r, 8).value,
        'Created': ws.cell(r, 9).value,
    }
    rows.append(row)

# --- 1. Unique assignment groups ---
groups = sorted(set(str(r['Assignment group']) for r in rows if r['Assignment group']))
print('=== UNIQUE ASSIGNMENT GROUPS ===')
for g in groups:
    count = sum(1 for r in rows if r['Assignment group'] == g)
    print(f'  {g}: {count}')

# --- 2. Sample descriptions ---
print()
print('=== SAMPLE SHORT DESCRIPTIONS (first 10) ===')
for r in rows[:10]:
    print(f"  [{r['Number']}] {r['Short description']}")

# --- 3. Find pCode pattern in description ---
# Try multiple patterns: P12345, PCODE-xxx, pcode: xxx
pcode_pat = re.compile(r'\b[Pp]\d{3,6}\b')

pcode_tickets = []
for r in rows:
    desc = str(r['Short description']) if r['Short description'] else ''
    matches = pcode_pat.findall(desc)
    if matches:
        pcode_tickets.append({**r, 'pcodes': [m.upper() for m in matches]})

print()
print(f'=== TICKETS WITH PCODE PATTERN IN DESCRIPTION: {len(pcode_tickets)} ===')
for t in pcode_tickets[:20]:
    print(f"  {t['Number']} | {t['pcodes']} | {t['Assignment group']} | {t['Short description'][:80]}")

# --- 4. Also check all descriptions for any code-like field ---
print()
print('=== ALL DESCRIPTIONS CONTAINING P + DIGITS ===')
all_pcodes_found = []
for r in rows:
    desc = str(r['Short description']) if r['Short description'] else ''
    m = re.findall(r'[Pp]\d{3,6}', desc)
    all_pcodes_found.extend([x.upper() for x in m])

unique_pcodes = sorted(set(all_pcodes_found))
print(f'Total unique pCodes found in descriptions: {len(unique_pcodes)}')
print('Unique pCodes:', unique_pcodes[:50])