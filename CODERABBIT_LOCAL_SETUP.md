# 🤖 CodeRabbit AI - Local CLI Setup

This guide shows you how to run CodeRabbit AI locally in your terminal before deploying code.

## 📋 Step 1: Install CodeRabbit CLI

### Option A: Install via npm (Recommended)

```bash
cd /Users/shiveshsrivastava/Desktop/healthcare-scheduler
npm install -g @coderabbitai/cli
```

### Option B: Install via npx (No global install)

You can run CodeRabbit directly with npx without installing:

```bash
npx @coderabbitai/cli
```

## 📋 Step 2: Get CodeRabbit API Key

1. **Sign up for CodeRabbit**:
   - Visit: https://coderabbit.ai
   - Sign up for a free account
   - Go to Settings → API Keys
   - Create a new API key
   - Copy the API key

2. **Set API Key as Environment Variable**:
   ```bash
   export CODERABBIT_API_KEY="your-api-key-here"
   ```
   
   Or add to your `~/.zshrc` or `~/.bashrc`:
   ```bash
   echo 'export CODERABBIT_API_KEY="your-api-key-here"' >> ~/.zshrc
   source ~/.zshrc
   ```

## 📋 Step 3: Run CodeRabbit Before Deploying

### Review Specific Files

```bash
# Review a specific file
cd /Users/shiveshsrivastava/Desktop/healthcare-scheduler
npx @coderabbitai/cli review backend/supabase/functions/handle-chat/index.ts

# Review multiple files
npx @coderabbitai/cli review backend/supabase/functions/**/*.ts frontend/src/**/*.tsx

# Review all TypeScript files
npx @coderabbitai/cli review "**/*.ts" "**/*.tsx"
```

### Review Recent Changes (Git Diff)

```bash
# Review uncommitted changes
npx @coderabbitai/cli review --git-diff

# Review changes in a specific commit
npx @coderabbitai/cli review --git-diff HEAD~1

# Review changes between branches
npx @coderabbitai/cli review --git-diff main..feature-branch
```

### Review Entire Directory

```bash
# Review backend functions
npx @coderabbitai/cli review backend/supabase/functions/

# Review frontend source
npx @coderabbitai/cli review frontend/src/

# Review everything
npx @coderabbitai/cli review .
```

## 📋 Step 4: Create a Pre-Deploy Script

Create a script to run CodeRabbit before deploying:

```bash
# Create review script
cat > review-before-deploy.sh << 'EOF'
#!/bin/bash

echo "🔍 Running CodeRabbit review before deployment..."

# Review backend changes
echo "📋 Reviewing backend functions..."
npx @coderabbitai/cli review backend/supabase/functions/ || {
    echo "❌ CodeRabbit found issues. Please review and fix before deploying."
    exit 1
}

# Review frontend changes
echo "📋 Reviewing frontend source..."
npx @coderabbitai/cli review frontend/src/ || {
    echo "❌ CodeRabbit found issues. Please review and fix before deploying."
    exit 1
}

echo "✅ CodeRabbit review passed! Safe to deploy."
EOF

chmod +x review-before-deploy.sh
```

## 📋 Step 5: Use Before Deploying

### Before Deploying Backend:

```bash
cd /Users/shiveshsrivastava/Desktop/healthcare-scheduler

# Run CodeRabbit review
npx @coderabbitai/cli review backend/supabase/functions/handle-chat/index.ts

# If review passes, deploy
cd backend
supabase functions deploy handle-chat --project-ref ljxugwfzkbjlrjwpglnx
```

### Before Deploying Frontend:

```bash
cd /Users/shiveshsrivastava/Desktop/healthcare-scheduler

# Run CodeRabbit review
npx @coderabbitai/cli review frontend/src/

# If review passes, commit and push
git add .
git commit -m "Your changes"
git push origin main
```

## 📋 Step 6: Add to Git Hooks (Optional)

You can add CodeRabbit to pre-commit hook:

```bash
# Install husky (if not already installed)
cd /Users/shiveshsrivastava/Desktop/healthcare-scheduler
npm install --save-dev husky

# Create pre-commit hook
npx husky init
echo 'npx @coderabbitai/cli review --git-diff' > .husky/pre-commit
chmod +x .husky/pre-commit
```

## 🎯 CodeRabbit CLI Options

```bash
# Basic usage
npx @coderabbitai/cli review <file-or-directory>

# Review with specific focus
npx @coderabbitai/cli review --focus security backend/
npx @coderabbitai/cli review --focus performance frontend/

# Review and output to file
npx @coderabbitai/cli review backend/ > code-review.txt

# Review with custom instructions
npx @coderabbitai/cli review --instructions "Focus on TypeScript type safety" backend/
```

## 🔧 Configuration

You can create a local `.coderabbitrc` file:

```json
{
  "apiKey": "your-api-key-here",
  "focus": ["security", "performance", "best_practices"],
  "ignore": ["node_modules", "dist", "build"],
  "language": "typescript"
}
```

## ✅ Quick Start

1. **Install CLI**:
   ```bash
   npm install -g @coderabbitai/cli
   ```

2. **Set API Key**:
   ```bash
   export CODERABBIT_API_KEY="your-api-key"
   ```

3. **Review Before Deploy**:
   ```bash
   cd /Users/shiveshsrivastava/Desktop/healthcare-scheduler
   npx @coderabbitai/cli review backend/supabase/functions/handle-chat/index.ts
   ```

4. **If review passes, deploy!**

## 📚 Resources

- **CodeRabbit CLI Docs**: https://docs.coderabbit.ai/cli
- **API Keys**: https://coderabbit.ai/settings/api-keys
- **Support**: https://coderabbit.ai/support

---

**Note**: CodeRabbit CLI is free for personal use. Check pricing for team usage.

