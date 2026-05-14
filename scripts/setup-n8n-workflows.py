#!/usr/bin/env python3
"""
N8N Workflow Setup Script
Creates the newsletter system workflows in n8n automatically.
"""

import os
import requests
import json
from pathlib import Path
import sys

def load_n8n_credentials():
    """Load n8n API credentials"""
    # Load from workspace secrets
    try:
        with open('/home/clawuser/.openclaw/workspace/secrets/n8n_api.key', 'r') as f:
            api_key = f.read().strip()
        
        # n8n base URL from env
        base_url = "http://172.18.0.2:5678"  # Internal n8n URL
        
        return api_key, base_url
    except Exception as e:
        print(f"❌ Error loading n8n credentials: {e}")
        return None, None

def test_n8n_connection(base_url, api_key):
    """Test connection to n8n API"""
    try:
        headers = {
            'X-N8N-API-KEY': api_key,
            'Content-Type': 'application/json'
        }
        
        response = requests.get(
            f"{base_url}/api/v1/workflows",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            workflows = response.json()
            return True, f"Connected - found {len(workflows.get('data', []))} existing workflows"
        else:
            return False, f"HTTP {response.status_code}: {response.text}"
    except Exception as e:
        return False, f"Connection error: {e}"

def check_existing_workflows(base_url, api_key):
    """Check for existing newsletter workflows"""
    try:
        headers = {
            'X-N8N-API-KEY': api_key,
            'Content-Type': 'application/json'
        }
        
        response = requests.get(
            f"{base_url}/api/v1/workflows",
            headers=headers,
            timeout=10
        )
        
        if response.status_code != 200:
            return {}
        
        workflows = response.json().get('data', [])
        existing = {}
        
        newsletter_workflow_names = [
            'Newsletter Subscriber Notification',
            'Operational Waste Audit Request Handler',
            'Weekly Newsletter Report Generator',
            'Platform Improvement Signal Capture',
            'Beehiiv Sync Handler'
        ]
        
        for workflow in workflows:
            name = workflow.get('name', '')
            if name in newsletter_workflow_names:
                existing[name] = {
                    'id': workflow.get('id'),
                    'active': workflow.get('active', False)
                }
        
        return existing
    except Exception as e:
        print(f"❌ Error checking existing workflows: {e}")
        return {}

def create_webhook_workflow(base_url, api_key, name, webhook_path, description):
    """Create a simple webhook workflow"""
    workflow_data = {
        "name": name,
        "nodes": [
            {
                "parameters": {
                    "path": webhook_path,
                    "responseMode": "onReceived",
                    "options": {}
                },
                "name": "Webhook",
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 1,
                "position": [250, 300],
                "webhookId": f"newsletter-{webhook_path.replace('/', '-')}"
            },
            {
                "parameters": {
                    "functionCode": f"// Process {name} data\\nconst data = items[0].json;\\nconsole.log('{name} received:', data);\\nreturn items;"
                },
                "name": "Process Data",
                "type": "n8n-nodes-base.function",
                "typeVersion": 1,
                "position": [450, 300]
            }
        ],
        "connections": {
            "Webhook": {
                "main": [
                    [
                        {
                            "node": "Process Data",
                            "type": "main",
                            "index": 0
                        }
                    ]
                ]
            }
        },
        "settings": {
            "saveDataErrorExecution": "all",
            "saveDataSuccessExecution": "all"
        }
    }
    
    try:
        headers = {
            'X-N8N-API-KEY': api_key,
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            f"{base_url}/api/v1/workflows",
            headers=headers,
            json=workflow_data,
            timeout=30
        )
        
        if response.status_code in [200, 201]:
            result = response.json()
            workflow_id = result.get('id') or result.get('data', {}).get('id')
            print(f"✅ Created workflow: {name} (ID: {workflow_id})")
            return True, workflow_id
        else:
            print(f"❌ Failed to create {name}: HTTP {response.status_code}")
            print(f"   Response: {response.text}")
            return False, None
    except Exception as e:
        print(f"❌ Error creating {name}: {e}")
        return False, None

def activate_workflow(base_url, api_key, workflow_id, name):
    """Activate a workflow"""
    try:
        headers = {
            'X-N8N-API-KEY': api_key,
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            f"{base_url}/api/v1/workflows/{workflow_id}/activate",
            headers=headers,
            timeout=10
        )
        
        if response.status_code in [200, 201]:
            print(f"✅ Activated workflow: {name}")
            return True
        else:
            print(f"❌ Failed to activate {name}: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error activating {name}: {e}")
        return False

def update_environment_variables():
    """Update .env.local with n8n webhook URLs"""
    env_path = Path(__file__).parent.parent / ".env.local"
    
    webhook_urls = {
        'N8N_NEWSLETTER_WEBHOOK_URL': 'https://n8n.ottoserv.com/webhook/newsletter-signup',
        'N8N_AUDIT_WEBHOOK_URL': 'https://n8n.ottoserv.com/webhook/audit-request',
        'N8N_PLATFORM_SIGNAL_WEBHOOK_URL': 'https://n8n.ottoserv.com/webhook/platform-signal'
    }
    
    try:
        with open(env_path, 'r') as f:
            content = f.read()
        
        lines = content.split('\n')
        updated_lines = []
        
        for line in lines:
            updated = False
            for key, value in webhook_urls.items():
                if line.startswith(f'{key}='):
                    updated_lines.append(f'{key}={value}')
                    updated = True
                    break
            
            if not updated:
                updated_lines.append(line)
        
        with open(env_path, 'w') as f:
            f.write('\n'.join(updated_lines))
        
        print("✅ Updated environment variables with webhook URLs")
        return True
    except Exception as e:
        print(f"❌ Error updating environment variables: {e}")
        return False

if __name__ == "__main__":
    print("🚀 N8N Webhook Setup Script")
    print("=" * 50)
    
    # Step 1: Load n8n credentials
    api_key, base_url = load_n8n_credentials()
    if not api_key:
        print("❌ Cannot load n8n API credentials")
        sys.exit(1)
    
    print(f"🔗 N8N URL: {base_url}")
    
    # Step 2: Test connection
    print("\n🔍 Testing n8n connection...")
    connected, message = test_n8n_connection(base_url, api_key)
    
    if not connected:
        print(f"❌ Connection failed: {message}")
        sys.exit(1)
    
    print(f"✅ {message}")
    
    # Step 3: Check existing workflows
    print("\n🔍 Checking existing workflows...")
    existing = check_existing_workflows(base_url, api_key)
    
    if existing:
        print("📋 Found existing newsletter workflows:")
        for name, info in existing.items():
            status = "🟢 Active" if info['active'] else "🔴 Inactive"
            print(f"   {name}: {status} (ID: {info['id']})")
    else:
        print("📝 No existing newsletter workflows found")
    
    # Step 4: Create webhook workflows
    print("\n🚀 Creating webhook workflows...")
    
    workflows_to_create = [
        ("Newsletter Signup Handler", "/newsletter-signup", "Processes new newsletter subscriptions"),
        ("Audit Request Handler", "/audit-request", "Handles operational waste audit requests"),
        ("Platform Signal Capture", "/platform-signal", "Captures platform improvement signals")
    ]
    
    created_count = 0
    activated_count = 0
    for name, path, description in workflows_to_create:
        if name not in existing:
            success, workflow_id = create_webhook_workflow(base_url, api_key, name, path, description)
            if success:
                created_count += 1
                # Activate the workflow
                if activate_workflow(base_url, api_key, workflow_id, name):
                    activated_count += 1
        else:
            print(f"⚠️  Workflow already exists: {name}")
            # Try to activate existing workflow
            workflow_id = existing[name]['id']
            if not existing[name]['active']:
                if activate_workflow(base_url, api_key, workflow_id, name):
                    activated_count += 1
    
    # Step 5: Update environment variables
    print("\n🔧 Updating environment variables...")
    env_updated = update_environment_variables()
    
    # Summary
    print(f"\n📊 Setup Summary:")
    print(f"   Workflows created: {created_count}")
    print(f"   Environment updated: {'✅' if env_updated else '❌'}")
    
    if created_count > 0 or existing:
        print("\n✅ N8N webhooks ready!")
        print("\n📋 Available endpoints:")
        print("   • https://n8n.ottoserv.com/webhook/newsletter-signup")
        print("   • https://n8n.ottoserv.com/webhook/audit-request") 
        print("   • https://n8n.ottoserv.com/webhook/platform-signal")
        
        print("\n🔗 Next steps:")
        print("1. Configure Telegram notifications in n8n workflows")
        print("2. Add HubSpot integration nodes")
        print("3. Test webhook endpoints with sample data")
        print("4. Enable scheduled workflows for weekly reports")
    else:
        print("\n⚠️  No workflows created - check n8n connection and permissions")