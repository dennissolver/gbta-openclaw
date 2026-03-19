# Go High Level (GHL) Integration for EasyOpenClaw

Connect your Go High Level CRM to EasyOpenClaw for contact sync, lead capture, and workflow automation.

## Quick Start

```bash
# 1. Install dependencies
pip install -r integrations/ghl/requirements.txt

# 2. Run setup (enter your GHL API Key and Location ID)
python integrations/ghl/ghl_setup.py

# 3. Test the connection
python integrations/ghl/ghl_cli.py contacts list
```

## CLI Commands

### List contacts
```bash
python integrations/ghl/ghl_cli.py contacts list --limit 20
```

### Create a lead
```bash
python integrations/ghl/ghl_cli.py leads create \
  --name "John Doe" \
  --email "john@example.com" \
  --phone "+61400000000" \
  --company "ACME Corp" \
  --source "EasyOpenClaw"
```

### Trigger a workflow
```bash
python integrations/ghl/ghl_cli.py workflows trigger \
  --workflow_id "abc123" \
  --contact_id "xyz789"
```

## Configuration

Credentials are stored in `integrations/ghl/.env`:

```
GHL_API_KEY=your-api-key
GHL_LOCATION_ID=your-location-id
GHL_BASE_URL=https://services.leadconnectorhq.com
```

## Getting Your API Credentials

1. Log in to Go High Level
2. Go to **Settings > Business Profile > API Keys**
3. Create a new API key with the required scopes
4. Copy the API Key and your Location ID

## Future: OpenClaw Skill

This integration will be packaged as an OpenClaw Skill with a `SKILL.md` for marketplace distribution. This will enable:
- One-click installation via ClawHub
- Web-based configuration UI
- Automatic credential management
- Richer GHL interactions (webhooks, field mappings, data enrichment)
