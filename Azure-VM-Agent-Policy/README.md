# Azure VM Agent Deployment via Policy (Validate → Install)

## Overview

This solution uses **Azure Policy `deployIfNotExists` (DINE)** to automatically check whether an agent is installed and running inside the OS of an Azure VM — and installs it only if it's missing or not running.

---

## How It Works

```
Azure Policy Engine
       │
       ▼
  Evaluate VM  ──── existenceCondition met? ──► YES → Compliant (no action)
       │
      NO
       │
       ▼
  Trigger Remediation Task
       │
       ▼
  Deploy VM Extension (Custom Script)
       │
       ▼
  Script runs on VM OS:
    1. Check if agent binary exists
    2. Check if agent service is running
    3. If both OK → exit 0 (no-op)
    4. If missing/stopped → download & install agent
```

---

## Two Deployment Patterns

### Pattern 1 — VM Extension-Based Agents (Recommended)
For agents distributed as Azure VM Extensions (e.g. Azure Monitor Agent, MMA/OMS, Defender for Endpoint). The policy checks the extension's `provisioningState` directly.

### Pattern 2 — Custom OS-Level Agents
For agents installed directly in the OS (e.g. third-party APM agents, security scanners, custom daemons). The policy deploys a **Custom Script Extension** that validates and installs the agent.

---

## Files in This Repository

| File | Purpose |
|------|---------|
| `policy-definitions/dine-vm-extension-agent.json` | DINE policy for VM Extension-based agents |
| `policy-definitions/dine-custom-script-agent.json` | DINE policy for custom OS-level agents via script |
| `scripts/install-agent-windows.ps1` | Windows: validate & install agent script |
| `scripts/install-agent-linux.sh` | Linux: validate & install agent script |
| `assignments/policy-assignment.json` | Policy assignment with managed identity |
| `assignments/remediation-task.json` | Trigger remediation on existing non-compliant VMs |
| `bicep/agent-policy.bicep` | Full Bicep deployment (policy + assignment + RBAC) |

---

## Quick Start

### 1. Deploy the Policy Definition
```bash
az policy definition create \
  --name "deploy-custom-agent-if-missing" \
  --display-name "Deploy custom agent to VMs if not present" \
  --rules policy-definitions/dine-custom-script-agent.json \
  --mode Indexed \
  --subscription <subscription-id>
```

### 2. Assign the Policy (creates Managed Identity automatically)
```bash
az policy assignment create \
  --name "deploy-agent-assignment" \
  --policy "deploy-custom-agent-if-missing" \
  --scope "/subscriptions/<subscription-id>" \
  --assign-identity \
  --identity-scope "/subscriptions/<subscription-id>" \
  --role "Contributor" \
  --location "uksouth"
```

### 3. Grant the Managed Identity Permissions
```bash
# Get the principal ID of the assignment's managed identity
PRINCIPAL_ID=$(az policy assignment show \
  --name "deploy-agent-assignment" \
  --scope "/subscriptions/<subscription-id>" \
  --query identity.principalId -o tsv)

# Assign Contributor or Virtual Machine Contributor role
az role assignment create \
  --role "Contributor" \
  --assignee-object-id $PRINCIPAL_ID \
  --scope "/subscriptions/<subscription-id>"
```

### 4. Trigger Remediation for Existing Non-Compliant VMs
Azure Policy only auto-remediates NEW or UPDATED resources. For existing VMs:
```bash
az policy remediation create \
  --name "remediate-existing-vms" \
  --policy-assignment "deploy-agent-assignment" \
  --resource-discovery-mode ReEvaluateCompliance \
  --scope "/subscriptions/<subscription-id>"
```

---

## Important Notes

- **Managed Identity**: DINE policies require a system-assigned managed identity on the policy assignment to perform deployments.
- **Custom Script Extension Limitation**: Only one Custom Script Extension can run on a VM at a time. If a CSE is already in use, use the `Run Command` resource type instead (see `dine-custom-script-agent.json` for the `runCommand` variant).
- **Idempotency**: Both scripts (`install-agent-windows.ps1` and `install-agent-linux.sh`) are fully idempotent — re-running them on an already-configured VM is safe.
- **Compliance lag**: After agent install, it can take **15–30 minutes** for Azure Policy to re-evaluate and mark the VM as compliant.