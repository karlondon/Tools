import openpyxl
import re
from collections import Counter, defaultdict
from datetime import datetime

wb = openpyxl.load_workbook('GCP Tickets.xlsx')
ws = wb['Page 1']

rows = []
for r in range(2, ws.max_row + 1):
    row = {
        'Number': ws.cell(r, 1).value,
        'Priority': ws.cell(r, 2).value,
        'State': ws.cell(r, 3).value,
        'Assignment group': str(ws.cell(r, 4).value or ''),
        'Assigned to': str(ws.cell(r, 5).value or ''),
        'Short description': str(ws.cell(r, 6).value or ''),
        'Task type': str(ws.cell(r, 7).value or ''),
        'Updated': ws.cell(r, 8).value,
        'Created': ws.cell(r, 9).value,
    }
    rows.append(row)

pcode_pat = re.compile(r'[Pp]\d{3,6}')

TARGET_GROUPS = {'GCP Engineers', 'Service Ops Engineers'}

# Enrich rows with pCodes
for r in rows:
    pcodes = list(set(m.upper() for m in pcode_pat.findall(r['Short description'])))
    r['pcodes'] = sorted(pcodes)

# --- Tickets with pCodes ---
pcode_tickets = [r for r in rows if r['pcodes']]

# --- GCP / SolOps team tickets ---
team_tickets = [r for r in rows if r['Assignment group'] in TARGET_GROUPS]
team_pcode_tickets = [r for r in team_tickets if r['pcodes']]

# --- Stats ---
all_group_counts = Counter(r['Assignment group'] for r in rows if r['Assignment group'])
team_group_counts = {g: all_group_counts.get(g, 0) for g in TARGET_GROUPS}

# Unique pCodes across all tickets
all_pcodes = sorted(set(p for r in pcode_tickets for p in r['pcodes']))

# Tickets per pCode (all tickets)
tickets_per_pcode = Counter(p for r in pcode_tickets for p in r['pcodes'])

# Tickets per pCode for target teams
team_tickets_per_pcode = Counter(p for r in team_pcode_tickets for p in r['pcodes'])

# Assignment group breakdown for pCode tickets
pcode_group_breakdown = defaultdict(Counter)
for r in pcode_tickets:
    for p in r['pcodes']:
        pcode_group_breakdown[p][r['Assignment group']] += 1

# Task type breakdown
task_type_counts = Counter(r['Task type'] for r in rows if r['Task type'])
team_task_type_counts = Counter(r['Task type'] for r in team_tickets if r['Task type'])

# Ticket state breakdown
state_counts = Counter(r['State'] for r in rows if r['State'])
team_state_counts = Counter(r['State'] for r in team_tickets if r['State'])

# Monthly trend (all tickets)
monthly = Counter()
team_monthly = Counter()
for r in rows:
    if r['Created']:
        key = r['Created'].strftime('%Y-%m')
        monthly[key] += 1
        if r['Assignment group'] in TARGET_GROUPS:
            team_monthly[key] += 1

sorted_months = sorted(monthly.keys())

# pCode monthly trend
pcode_monthly = Counter()
for r in pcode_tickets:
    if r['Created']:
        pcode_monthly[r['Created'].strftime('%Y-%m')] += 1

# ---- Build HTML ----
def bar(value, max_val, width=200):
    pct = int((value / max_val) * width) if max_val else 0
    return f'<div class="bar" style="width:{pct}px"></div>'

rows_html = ''
for r in sorted(pcode_tickets, key=lambda x: x['Number'], reverse=True):
    pcode_badges = ' '.join(f'<span class="badge">{p}</span>' for p in r['pcodes'])
    team_highlight = ' team-row' if r['Assignment group'] in TARGET_GROUPS else ''
    rows_html += f"""
    <tr class="{team_highlight}">
      <td>{r['Number']}</td>
      <td>{pcode_badges}</td>
      <td>{r['Assignment group']}</td>
      <td>{r['State']}</td>
      <td>{r['Task type']}</td>
      <td>{r['Short description'][:90]}</td>
      <td>{r['Created'].strftime('%Y-%m-%d') if r['Created'] else ''}</td>
    </tr>"""

pcode_table_rows = ''
max_count = max(tickets_per_pcode.values()) if tickets_per_pcode else 1
for p in sorted(tickets_per_pcode, key=lambda x: -tickets_per_pcode[x]):
    total = tickets_per_pcode[p]
    team_count = team_tickets_per_pcode.get(p, 0)
    groups = ', '.join(f'{g}({c})' for g, c in sorted(pcode_group_breakdown[p].items(), key=lambda x: -x[1]))
    pcode_table_rows += f"""
    <tr>
      <td><span class="badge">{p}</span></td>
      <td>{total} {bar(total, max_count)}</td>
      <td>{team_count}</td>
      <td>{groups}</td>
    </tr>"""

group_rows = ''
max_g = max(all_group_counts.values()) if all_group_counts else 1
for g, c in sorted(all_group_counts.items(), key=lambda x: -x[1]):
    highlight = ' style="font-weight:bold;color:#1a73e8"' if g in TARGET_GROUPS else ''
    group_rows += f'<tr><td{highlight}>{g}</td><td>{c} {bar(c, max_g)}</td></tr>'

month_labels = str(sorted_months)
month_all = [monthly.get(m, 0) for m in sorted_months]
month_team = [team_monthly.get(m, 0) for m in sorted_months]
month_pcode = [pcode_monthly.get(m, 0) for m in sorted_months]

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>GCP Ticket Analysis Report</title>
<style>
  body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6fb; color: #222; margin: 0; padding: 0; }}
  header {{ background: linear-gradient(135deg, #1a73e8, #0d47a1); color: white; padding: 32px 40px; }}
  header h1 {{ margin: 0 0 6px; font-size: 2rem; }}
  header p {{ margin: 0; opacity: .85; }}
  .container {{ max-width: 1200px; margin: 0 auto; padding: 32px 24px; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap: 16px; margin-bottom: 32px; }}
  .card {{ background: white; border-radius: 10px; padding: 20px 24px; box-shadow: 0 2px 8px rgba(0,0,0,.08); text-align: center; }}
  .card .num {{ font-size: 2.4rem; font-weight: 700; color: #1a73e8; }}
  .card .label {{ font-size: .85rem; color: #666; margin-top: 4px; }}
  .section {{ background: white; border-radius: 10px; padding: 24px; margin-bottom: 28px; box-shadow: 0 2px 8px rgba(0,0,0,.08); }}
  .section h2 {{ margin: 0 0 18px; font-size: 1.1rem; color: #1a73e8; border-bottom: 2px solid #e8f0fe; padding-bottom: 10px; }}
  table {{ width: 100%; border-collapse: collapse; font-size: .88rem; }}
  th {{ background: #e8f0fe; color: #1a73e8; padding: 8px 10px; text-align: left; }}
  td {{ padding: 7px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }}
  tr:hover td {{ background: #f8faff; }}
  .team-row td {{ background: #e8f8ee; }}
  .badge {{ display: inline-block; background: #1a73e8; color: white; border-radius: 12px; padding: 2px 10px; font-size: .78rem; margin: 1px; }}
  .bar {{ height: 14px; background: linear-gradient(90deg,#1a73e8,#42a5f5); border-radius: 3px; display: inline-block; vertical-align: middle; }}
  .chart-wrap {{ position: relative; height: 280px; }}
  canvas {{ max-width: 100%; }}
  .note {{ font-size:.8rem; color:#888; margin-top:8px; }}
</style>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
</head>
<body>
<header>
  <h1>📊 GCP Ticket Analysis Report</h1>
  <p>GCP Engineering &amp; Solutions Operations · Generated {datetime.now().strftime('%d %B %Y %H:%M')}</p>
</header>
<div class="container">

<!-- KPI Cards -->
<div class="grid">
  <div class="card"><div class="num">{len(rows)}</div><div class="label">Total Tickets</div></div>
  <div class="card"><div class="num">{len(pcode_tickets)}</div><div class="label">Tickets with pCode</div></div>
  <div class="card"><div class="num">{len(all_pcodes)}</div><div class="label">Unique pCodes (Clients)</div></div>
  <div class="card"><div class="num">{sum(team_group_counts.values())}</div><div class="label">GCP Eng + SolOps Tickets</div></div>
  <div class="card"><div class="num">{len(team_pcode_tickets)}</div><div class="label">Team pCode Tickets</div></div>
  <div class="card"><div class="num">{len(sorted_months)}</div><div class="label">Months of Activity</div></div>
</div>

<!-- Monthly Trend -->
<div class="section">
  <h2>📈 Monthly Ticket Trend</h2>
  <div class="chart-wrap"><canvas id="monthChart"></canvas></div>
  <p class="note">All tickets vs GCP Engineers + Service Ops Engineers vs pCode tickets by month created</p>
</div>

<!-- pCode Analysis -->
<div class="section">
  <h2>🏷️ Tickets per pCode (Client) — {len(all_pcodes)} Unique Clients</h2>
  <table>
    <tr><th>pCode</th><th>Total Tickets</th><th>Team Tickets (GCP Eng / SolOps)</th><th>Handled By</th></tr>
    {pcode_table_rows}
  </table>
</div>

<!-- Assignment Group Breakdown -->
<div class="section">
  <h2>👥 Tickets by Assignment Group</h2>
  <table>
    <tr><th>Assignment Group</th><th>Ticket Count</th></tr>
    {group_rows}
  </table>
  <p class="note">Bold blue = target teams (GCP Engineers, Service Ops Engineers)</p>
</div>

<!-- Task Type Breakdown -->
<div class="section">
  <h2>📋 Task Type Distribution</h2>
  <div class="chart-wrap" style="height:220px"><canvas id="taskChart"></canvas></div>
</div>

<!-- pCode Tickets Table -->
<div class="section">
  <h2>🔍 All Tickets with pCode (highlighted = GCP Eng / SolOps)</h2>
  <table>
    <tr><th>Ticket #</th><th>pCode(s)</th><th>Assignment Group</th><th>State</th><th>Type</th><th>Description</th><th>Created</th></tr>
    {rows_html}
  </table>
</div>

</div>

<script>
const months = {sorted_months};
const allData = {month_all};
const teamData = {month_team};
const pcodeData = {month_pcode};

new Chart(document.getElementById('monthChart'), {{
  type: 'bar',
  data: {{
    labels: months,
    datasets: [
      {{ label: 'All Tickets', data: allData, backgroundColor: 'rgba(26,115,232,0.25)', borderColor: '#1a73e8', borderWidth: 1.5, type: 'bar' }},
      {{ label: 'GCP Eng + SolOps', data: teamData, backgroundColor: 'rgba(52,168,83,0.7)', borderColor: '#34a853', borderWidth: 1.5, type: 'line', fill: false, tension: 0.3, pointRadius: 4 }},
      {{ label: 'pCode Tickets', data: pcodeData, backgroundColor: 'rgba(234,67,53,0.7)', borderColor: '#ea4335', borderWidth: 1.5, type: 'line', fill: false, tension: 0.3, pointRadius: 4 }}
    ]
  }},
  options: {{ responsive: true, maintainAspectRatio: false, plugins: {{ legend: {{ position: 'top' }} }}, scales: {{ y: {{ beginAtZero: true }} }} }}
}});

const taskLabels = {list(task_type_counts.keys())};
const taskVals = {list(task_type_counts.values())};
new Chart(document.getElementById('taskChart'), {{
  type: 'doughnut',
  data: {{
    labels: taskLabels,
    datasets: [{{ data: taskVals, backgroundColor: ['#1a73e8','#34a853','#fbbc04','#ea4335','#9c27b0','#00bcd4'] }}]
  }},
  options: {{ responsive: true, maintainAspectRatio: false, plugins: {{ legend: {{ position: 'right' }} }} }}
}});
</script>
</body>
</html>"""

with open('GCP_Ticket_Analysis.html', 'w') as f:
    f.write(html)

print("Report written to GCP_Ticket_Analysis.html")
print(f"Total rows: {len(rows)}")
print(f"pCode tickets: {len(pcode_tickets)}")
print(f"Unique pCodes: {len(all_pcodes)}")
print(f"pCodes: {all_pcodes}")
print(f"Team tickets: {sum(team_group_counts.values())}")