# 🤖 CodeRabbit AI Integration Guide

This guide will help you integrate CodeRabbit AI for automated code reviews and analysis.

## What is CodeRabbit?

CodeRabbit is an AI-powered code review tool that:
- ✅ Automatically reviews pull requests
- ✅ Provides suggestions for improvements
- ✅ Checks for security vulnerabilities
- ✅ Analyzes code quality and best practices
- ✅ Offers chat-based code assistance

## 📋 Step 1: Install CodeRabbit GitHub App

1. **Go to GitHub Marketplace**:
   - Visit: https://github.com/marketplace/coderabbitai
   - Or search "CodeRabbit" in GitHub Marketplace

2. **Install CodeRabbit**:
   - Click **"Set up a plan"** or **"Install"**
   - Choose **"Free"** plan (or paid if you prefer)
   - Select your GitHub account or organization

3. **Configure Installation**:
   - Choose **"Only select repositories"**
   - Select: **`healthcare-scheduler`**
   - Click **"Install"**

4. **Authorize Permissions**:
   - Grant CodeRabbit access to:
     - ✅ Pull requests
     - ✅ Issues
     - ✅ Repository contents
     - ✅ Commit statuses

## 📋 Step 2: Verify Configuration

The `.coderabbit.yaml` file has been created in your repository root. This configures CodeRabbit to:

- Review TypeScript files in `backend/supabase/functions/` and `frontend/src/`
- Focus on security, performance, and best practices
- Exclude sensitive files and build artifacts

## 📋 Step 3: Test CodeRabbit

1. **Create a Test Pull Request**:
   ```bash
   git checkout -b test-coderabbit
   # Make a small change
   git commit -m "Test: CodeRabbit integration"
   git push origin test-coderabbit
   ```

2. **Create PR on GitHub**:
   - Go to your repository on GitHub
   - Click **"New Pull Request"**
   - Select `test-coderabbit` → `main`
   - CodeRabbit will automatically review the PR

3. **View CodeRabbit Comments**:
   - CodeRabbit will add review comments on your PR
   - Review suggestions and apply fixes if needed

## 🎯 CodeRabbit Features

### Automated Reviews
- Reviews every pull request automatically
- Provides line-by-line suggestions
- Checks for security issues

### Chat Feature
- Ask questions about your code
- Get explanations for complex code
- Request code improvements

### Focus Areas
Based on `.coderabbit.yaml`, CodeRabbit will focus on:
- 🔒 **Security**: API keys, tokens, data exposure
- ⚡ **Performance**: Unnecessary re-renders, API calls
- 📝 **Best Practices**: React, TypeScript patterns
- 🛡️ **Error Handling**: Async functions, try-catch blocks
- 🔷 **Type Safety**: TypeScript types, interfaces

## 🔧 Customization

Edit `.coderabbit.yaml` to customize:
- Which files to review
- What to focus on
- Auto-approve settings
- Ignore patterns

## 📚 Resources

- **CodeRabbit Docs**: https://docs.coderabbit.ai
- **GitHub App**: https://github.com/apps/coderabbitai
- **Support**: https://coderabbit.ai/support

## ✅ Verification

After installation, you should see:
1. ✅ CodeRabbit app installed on your repository
2. ✅ `.coderabbit.yaml` file in repository root
3. ✅ CodeRabbit comments on new pull requests

## 🚀 Next Steps

1. Install CodeRabbit from GitHub Marketplace
2. Create a test PR to verify it's working
3. Review CodeRabbit's suggestions
4. Apply improvements to your codebase

---

**Note**: CodeRabbit is free for public repositories. For private repos, check their pricing plans.

