#!/usr/bin/env python3
"""
Go High Level CLI for EasyOpenClaw

Lightweight command-line interface to interact with GHL.
Reads credentials from integrations/ghl/.env

Usage:
  ghl_cli.py contacts list [--limit N]
  ghl_cli.py leads create --name NAME --email EMAIL [--phone PHONE] [--company COMPANY] [--source SOURCE]
  ghl_cli.py workflows trigger --workflow_id ID --contact_id ID
"""

import argparse
import json
import os
import sys

try:
    from dotenv import load_dotenv
    import requests
except ImportError:
    print("Missing dependencies. Run: pip install -r integrations/ghl/requirements.txt")
    sys.exit(1)

# Load credentials
ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(ENV_PATH)

API_KEY = os.getenv("GHL_API_KEY", "")
LOCATION_ID = os.getenv("GHL_LOCATION_ID", "")
BASE_URL = os.getenv("GHL_BASE_URL", "https://services.leadconnectorhq.com")

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Version": "2021-07-28",
    "Content-Type": "application/json",
}


def check_credentials():
    if not API_KEY or not LOCATION_ID:
        print("Error: GHL credentials not configured.")
        print("Run: python integrations/ghl/ghl_setup.py")
        sys.exit(1)


def contacts_list(args):
    """List contacts from GHL."""
    check_credentials()
    limit = args.limit or 20
    resp = requests.get(
        f"{BASE_URL}/contacts/",
        headers=HEADERS,
        params={"locationId": LOCATION_ID, "limit": limit},
        timeout=15,
    )
    if resp.status_code != 200:
        print(f"Error {resp.status_code}: {resp.text[:200]}")
        return

    data = resp.json()
    contacts = data.get("contacts", [])
    print(f"\n=== Contacts ({len(contacts)}) ===\n")
    for c in contacts:
        name = f"{c.get('firstName', '')} {c.get('lastName', '')}".strip() or "No Name"
        email = c.get("email", "—")
        phone = c.get("phone", "—")
        print(f"  {c.get('id', '?')[:8]}  {name:<25} {email:<30} {phone}")


def leads_create(args):
    """Create a new contact/lead in GHL."""
    check_credentials()
    payload = {
        "firstName": args.name.split()[0] if args.name else "",
        "lastName": " ".join(args.name.split()[1:]) if args.name and " " in args.name else "",
        "email": args.email,
        "locationId": LOCATION_ID,
    }
    if args.phone:
        payload["phone"] = args.phone
    if args.company:
        payload["companyName"] = args.company
    if args.source:
        payload["source"] = args.source

    resp = requests.post(
        f"{BASE_URL}/contacts/",
        headers=HEADERS,
        json=payload,
        timeout=15,
    )
    if resp.status_code in (200, 201):
        data = resp.json()
        contact = data.get("contact", data)
        print(f"\nLead created successfully!")
        print(f"  ID: {contact.get('id', '?')}")
        print(f"  Name: {args.name}")
        print(f"  Email: {args.email}")
    else:
        print(f"Error {resp.status_code}: {resp.text[:300]}")


def workflows_trigger(args):
    """Trigger a GHL workflow for a contact."""
    check_credentials()
    resp = requests.post(
        f"{BASE_URL}/contacts/{args.contact_id}/workflow/{args.workflow_id}",
        headers=HEADERS,
        json={},
        timeout=15,
    )
    if resp.status_code in (200, 201):
        print(f"\nWorkflow triggered successfully!")
        print(f"  Workflow: {args.workflow_id}")
        print(f"  Contact: {args.contact_id}")
    else:
        print(f"Error {resp.status_code}: {resp.text[:300]}")


def main():
    parser = argparse.ArgumentParser(
        description="Go High Level CLI for EasyOpenClaw",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # contacts
    contacts_parser = subparsers.add_parser("contacts", help="Manage contacts")
    contacts_sub = contacts_parser.add_subparsers(dest="action")
    list_parser = contacts_sub.add_parser("list", help="List contacts")
    list_parser.add_argument("--limit", type=int, default=20, help="Max contacts to return")

    # leads
    leads_parser = subparsers.add_parser("leads", help="Manage leads")
    leads_sub = leads_parser.add_subparsers(dest="action")
    create_parser = leads_sub.add_parser("create", help="Create a new lead")
    create_parser.add_argument("--name", required=True, help="Contact name")
    create_parser.add_argument("--email", required=True, help="Contact email")
    create_parser.add_argument("--phone", help="Contact phone")
    create_parser.add_argument("--company", help="Company name")
    create_parser.add_argument("--source", help="Lead source")

    # workflows
    wf_parser = subparsers.add_parser("workflows", help="Manage workflows")
    wf_sub = wf_parser.add_subparsers(dest="action")
    trigger_parser = wf_sub.add_parser("trigger", help="Trigger a workflow")
    trigger_parser.add_argument("--workflow_id", required=True, help="Workflow ID")
    trigger_parser.add_argument("--contact_id", required=True, help="Contact ID")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    if args.command == "contacts" and args.action == "list":
        contacts_list(args)
    elif args.command == "leads" and args.action == "create":
        leads_create(args)
    elif args.command == "workflows" and args.action == "trigger":
        workflows_trigger(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
