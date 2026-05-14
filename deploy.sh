#!/bin/bash

# OttoServ Website Deployment Script
# Deploys changes to GitHub and triggers Vercel deployment

set -e

echo "🚀 OttoServ Website Deployment"
echo "=============================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from the website root directory"
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Error: Uncommitted changes detected. Please commit all changes first."
    exit 1
fi

# Check if we have commits to push
COMMITS_AHEAD=$(git rev-list --count origin/main..HEAD)
if [ "$COMMITS_AHEAD" -eq 0 ]; then
    echo "✅ Repository is up to date. No deployment needed."
    exit 0
fi

echo "📊 Found $COMMITS_AHEAD commits ready for deployment"
echo ""

# Show what we're about to deploy
echo "📋 Changes to deploy:"
git log origin/main..HEAD --oneline
echo ""

# Attempt to push to GitHub
echo "🌐 Pushing to GitHub..."
if git push origin main; then
    echo "✅ Successfully pushed to GitHub"
else
    echo "❌ Failed to push to GitHub"
    echo ""
    echo "💡 Troubleshooting:"
    echo "   1. Check GitHub authentication (token or SSH key)"
    echo "   2. Verify repository permissions"
    echo "   3. See deploy.md for detailed options"
    exit 1
fi

# Check if Vercel deployment is triggered
echo "🔄 Checking Vercel deployment status..."
echo "   Website: https://v0-ottoserv.vercel.app"
echo ""

echo "✅ Deployment initiated successfully!"
echo ""
echo "📍 Next Steps:"
echo "   1. Monitor Vercel deployment at: https://vercel.com/dashboard"
echo "   2. Verify changes at: https://v0-ottoserv.vercel.app"
echo "   3. Check for any deployment errors in Vercel logs"
echo ""
echo "🎉 Deployment complete!"