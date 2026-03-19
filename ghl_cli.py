import os
import argparse
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

GHL_API_KEY = os.getenv("GHL_API_KEY")
GHL_SECRET_KEY = os.getenv(
    "GHL_SECRET_KEY")  # Assuming a secret key is also used, GHL might use auth tokens differently

# Basic validation
if not GHL_API_KEY:
    print("Error: GHL_API_KEY not found in .env file. Please run python ghl_setup.py first.")
    exit(1)

# For Go High Level, authentication usually involves passing the API key in headers.
# The exact authentication mechanism might differ based on GHL's API documentation.
# This is a placeholder for the actual authentication method.
# Common practice: 'Authorization': f'Bearer {GHL_API_KEY}'
# Or sometimes an 'Api-Key' header. We'll use a common pattern here.
AUTH_HEADERS = {
    'Authorization': f'Bearer {GHL_API_KEY}',
    'Content-Type': 'application/json'
}

# Placeholder for GHL API base URL. This needs to be confirmed with GHL API docs.
# For example: 'https://api.mygohighlevel.com/v1'
GHL_API_BASE_URL = os.getenv("GHL_API_BASE_URL", "https://api.gohighlevel.com/v1")  # Example URL, may need updating


# --- Command Functions ---

def list_contacts(args):
    """Fetches and lists contacts."""
    print("Fetching contacts...")
    try:
        # The actual endpoint for contacts needs to be confirmed from GHL API docs.
        # This is a common pattern: /contacts
        # It might require a specific locationId or other parameters.
        endpoint = f"{GHL_API_BASE_URL}/contacts"

        # You might need to pass filters or parameters here based on args.contacts, args.email etc.
        # Example: params = {'email': args.email} if args.email else {}
        params = {}

        response = requests.get(endpoint, headers=AUTH_HEADERS, params=params, timeout=10)
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)

        data = response.json()

        if data and 'contacts' in data:  # Assuming response structure has a 'contacts' key
            print(f"Found {len(data['contacts'])} contacts:")
            for contact in data['contacts']:
                # Display relevant contact info - adjust keys as needed per GHL API response
                name = f"{contact.get('firstName', '')} {contact.get('lastName', '')}".strip()
                email = contact.get('email', 'N/A')
                phone = contact.get('phone', 'N/A')
                print(f"- Name: {name}, Email: {email}, Phone: {phone}")
        elif data:
            print("No 'contacts' key found in response, raw data:", data)
        else:
            print("No contacts found or empty response.")

    except requests.exceptions.RequestException as e:
        print(f"Error fetching contacts: {e}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")


def create_lead(args):
    """Creates a new lead/contact."""
    print(f"Creating lead: {args.name} ({args.email})")
    try:
        endpoint = f"{GHL_API_BASE_URL}/contacts"  # GHL typically uses 'contacts' for leads as well

        payload = {
            "name": args.name,  # Assuming 'name' field accepts full name or first/last name needs separation
            "email": args.email,
            "phone": args.phone,
            # Add other fields as needed. You might need to map these:
            # "firstName": args.name.split()[0],
            # "lastName": " ".join(args.name.split()[1:]),
            # "companyName": args.company
        }
        # Remove keys with None values if GHL API is strict about them
        payload = {k: v for k, v in payload.items() if v is not None}

        response = requests.post(endpoint, headers=AUTH_HEADERS, json=payload, timeout=10)
        response.raise_for_status()

        data = response.json()
        print(f"Lead created successfully! ID: {data.get('id', 'N/A')}")  # Assuming response has an 'id'

    except requests.exceptions.RequestException as e:
        print(f"Error creating lead: {e}")
        if e.response and e.response.json():
            print(f"API Error details: {e.response.json()}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")


def trigger_workflow(args):
    """Triggers a Go High Level workflow."""
    print(f"Triggering workflow {args.workflow_id} for contact {args.contact_id}...")
    try:
        # The endpoint for triggering workflows varies. It might be a specific endpoint
        # or via a contact update/action. This is a common pattern, but needs verification.
        # Example: POST /workflows/{workflow_id}/trigger
        endpoint = f"{GHL_API_BASE_URL}/workflows/{args.workflow_id}/trigger"

        payload = {
            "contactId": args.contact_id,
            # Other parameters might be required depending on the workflow
            # "data": {} # For passing specific data to the workflow
        }

        response = requests.post(endpoint, headers=AUTH_HEADERS, json=payload, timeout=10)
        response.raise_for_status()

        data = response.json()
        print(f"Workflow trigger initiated successfully.")
        # API might return status or confirmation details
        # print("Response:", data)

    except requests.exceptions.RequestException as e:
        print(f"Error triggering workflow: {e}")
        if e.response and e.response.json():
            print(f"API Error details: {e.response.json()}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")


# --- Main CLI Setup ---

def main():
    parser = argparse.ArgumentParser(description="Interact with Go High Level API.")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # --- List Contacts Command ---
    parser_list_contacts = subparsers.add_parser("contacts", help="Manage contacts.")
    contacts_subparsers = parser_list_contacts.add_subparsers(dest="subcommand", help="Contact actions")

    parser_list = contacts_subparsers.add_parser("list", help="List contacts.")
    # Add arguments for filtering if needed, e.g.:
    # parser_list.add_argument("--email", help="Filter contacts by email address.")
    parser_list.set_defaults(func=list_contacts)

    # --- Create Lead Command ---
    parser_create_lead = subparsers.add_parser("create-lead", help="Create a new lead.")
    parser_create_lead.add_argument("--name", required=True, help="Full name of the lead.")
    parser_create_lead.add_argument("--email", required=True, help="Email address of the lead.")
    parser_create_lead.add_argument("--phone", help="Phone number of the lead.")
    # parser_create_lead.add_argument("--company", help="Company name.") # Example additional field
    parser_create_lead.set_defaults(func=create_lead)

    # --- Trigger Workflow Command ---
    parser_trigger_workflow = subparsers.add_parser("trigger-workflow", help="Trigger a workflow.")
    parser_trigger_workflow.add_argument("--workflow_id", required=True,
                                         help="The ID of the Go High Level workflow to trigger.")
    parser_trigger_workflow.add_argument("--contact_id", required=True,
                                         help="The ID of the contact to associate with the workflow trigger.")
    parser_trigger_workflow.set_defaults(func=trigger_workflow)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    # If a subcommand was selected but no specific function is set (e.g., just 'contacts' was typed)
    if hasattr(args, 'func'):
        args.func(args)
    else:
        # If the user typed something like 'contacts' but not 'list', print subcommand help
        if args.command == 'contacts':
            parser_list_contacts.print_help()
        # Add similar else if blocks for other parent subparsers if they don't have a default function
        else:
            parser.print_help()


if __name__ == "__main__":
    main()