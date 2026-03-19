#!/usr/bin/env python3
"""
Go High Level (GHL) Setup Script for EasyOpenClaw

Prompts for GHL API credentials and writes them to integrations/ghl/.env
Validates credentials with a lightweight test call.
"""

import os
import sys

try:
    import requests
except ImportError:
    print("Missing dependency: requests")
    print("Run: pip install -r integrations/ghl/requirements.txt")
    sys.exit(1)

ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
DEFAULT_BASE_URL = "https://services.leadconnectorhq.com"


def prompt_credentials():
    print("\n=== Go High Level Integration Setup ===\n")
    print("You'll need your GHL API Key and Location ID.")
    print("Find these in GHL > Settings > Business Profile > API Keys.\n")

    api_key = input("GHL API Key: ").strip()
    if not api_key:
        print("Error: API Key is required.")
        sys.exit(1)

    location_id = input("GHL Location ID: ").strip()
    if not location_id:
        print("Error: Location ID is required.")
        sys.exit(1)

    base_url = input(f"GHL API Base URL [{DEFAULT_BASE_URL}]: ").strip()
    if not base_url:
        base_url = DEFAULT_BASE_URL

    return api_key, location_id, base_url


def validate_credentials(api_key, location_id, base_url):
    """Test the credentials with a lightweight API call."""
    print("\nValidating credentials...")
    try:
        resp = requests.get(
            f"{base_url}/contacts/",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Version": "2021-07-28",
            },
            params={"locationId": location_id, "limit": 1},
            timeout=15,
        )
        if resp.status_code == 200:
            print("Credentials validated successfully!")
            return True
        elif resp.status_code == 401:
            print(f"Authentication failed (401). Check your API Key.")
            return False
        else:
            print(f"Unexpected response: {resp.status_code}")
            print(f"Response: {resp.text[:200]}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"Connection error: {e}")
        return False


def write_env(api_key, location_id, base_url):
    """Write credentials to .env file."""
    with open(ENV_PATH, "w") as f:
        f.write(f"GHL_API_KEY={api_key}\n")
        f.write(f"GHL_LOCATION_ID={location_id}\n")
        f.write(f"GHL_BASE_URL={base_url}\n")
    print(f"\nCredentials saved to: {ENV_PATH}")


def main():
    api_key, location_id, base_url = prompt_credentials()

    valid = validate_credentials(api_key, location_id, base_url)
    if not valid:
        proceed = input("\nCredentials could not be validated. Save anyway? [y/N]: ").strip().lower()
        if proceed != "y":
            print("Setup cancelled.")
            sys.exit(1)

    write_env(api_key, location_id, base_url)

    print("\n=== Setup Complete ===")
    print("\nNext steps:")
    print("  1. Test: python integrations/ghl/ghl_cli.py contacts list")
    print("  2. Create a lead: python integrations/ghl/ghl_cli.py leads create --name 'John' --email 'john@example.com'")
    print("  3. Trigger a workflow: python integrations/ghl/ghl_cli.py workflows trigger --workflow_id <id> --contact_id <id>")


if __name__ == "__main__":
    main()
