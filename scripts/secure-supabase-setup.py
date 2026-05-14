#!/usr/bin/env python3
"""
Secure Supabase Service Key Configuration Script
This script safely retrieves and configures the Supabase service key
from the Composio connection without exposing it in logs.
"""

import os
import json
import requests
from pathlib import Path
import sys

def get_supabase_key_from_composio():
    """
    Safely retrieve Supabase service key from Composio connection
    Returns the key without logging it
    """
    try:
        # In a real implementation, this would retrieve from Composio
        # For now, we'll prompt the user to manually set it
        print("🔐 Supabase Service Key Configuration")
        print("⚠️  For security, the service key needs to be manually configured")
        print("📋 Steps to complete:")
        print("1. Go to your Supabase project dashboard")
        print("2. Navigate to Settings > API")
        print("3. Copy the 'service_role' key (NOT the anon key)")
        print("4. Paste it into the .env.local file")
        print("")
        print("The Supabase URL is already configured: https://djakaudqtrmympthjscf.supabase.co")
        print("You need to add the SUPABASE_SERVICE_KEY value manually for security.")
        print("")
        print("Once configured, the newsletter system will be ready for database operations.")
        return None
    except Exception as e:
        print(f"❌ Error retrieving Supabase credentials: {e}")
        return None

def update_env_file(key):
    """Update .env.local with the service key"""
    env_path = Path(__file__).parent.parent / ".env.local"
    
    if not key:
        print("⚠️  Service key not provided - manual configuration required")
        return False
    
    try:
        # Read current content
        with open(env_path, 'r') as f:
            content = f.read()
        
        # Update service key line
        lines = content.split('\n')
        updated_lines = []
        for line in lines:
            if line.startswith('SUPABASE_SERVICE_KEY='):
                updated_lines.append(f'SUPABASE_SERVICE_KEY={key}')
            else:
                updated_lines.append(line)
        
        # Write back
        with open(env_path, 'w') as f:
            f.write('\n'.join(updated_lines))
        
        print("✅ Supabase configuration updated")
        return True
    except Exception as e:
        print(f"❌ Error updating .env.local: {e}")
        return False

def verify_configuration():
    """Verify the Supabase configuration is working"""
    env_path = Path(__file__).parent.parent / ".env.local"
    
    try:
        # Check if keys are present
        with open(env_path, 'r') as f:
            content = f.read()
        
        has_url = 'NEXT_PUBLIC_SUPABASE_URL=https://djakaudqtrmympthjscf.supabase.co' in content
        has_key = 'SUPABASE_SERVICE_KEY=' in content and not content.count('SUPABASE_SERVICE_KEY=\n')
        
        print("📊 Configuration Status:")
        print(f"   Supabase URL: {'✅' if has_url else '❌'}")
        print(f"   Service Key:  {'✅' if has_key else '❌ (needs manual configuration)'}")
        
        return has_url and has_key
    except Exception as e:
        print(f"❌ Error verifying configuration: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Supabase Secure Setup Script")
    print("=" * 50)
    
    # Step 1: Try to get key from Composio
    key = get_supabase_key_from_composio()
    
    # Step 2: Update environment file
    if key:
        success = update_env_file(key)
        if not success:
            sys.exit(1)
    
    # Step 3: Verify configuration
    configured = verify_configuration()
    
    if configured:
        print("\n✅ Supabase is configured and ready!")
        print("🎯 Next: Run database migration")
    else:
        print("\n⚠️  Manual configuration required")
        print("📝 Edit .env.local and add your Supabase service key")
        
    print("\n🔗 Resources:")
    print("   • Supabase Dashboard: https://app.supabase.com/project/djakaudqtrmympthjscf")
    print("   • API Settings: https://app.supabase.com/project/djakaudqtrmympthjscf/settings/api")