# 🔍 Local Code Review Setup

Since CodeRabbit doesn't have a public CLI, here's how to run code reviews locally before deploying.

## 📋 Available Tools

### 1. TypeScript Type Checking

Check for TypeScript errors:

```bash
cd /Users/shiveshsrivastava/Desktop/healthcare-scheduler

# Check frontend
cd frontend
npx tsc --noEmit

# Check backend (Deno has built-in type checking)
cd ../backend
deno check supabase/functions/handle-chat/index.ts
```

### 2. ESLint (Code Quality)

```bash
cd /Users/shiveshsrivastava/Desktop/healthcare-scheduler/frontend
npm run lint
```

### 3. Manual Review Checklist

Before deploying, check:

- ✅ No TypeScript errors
- ✅ No console.log statements in production code
- ✅ No hardcoded API keys or secrets
- ✅ Proper error handling
- ✅ Type safety (no `any` types where possible)

## 🚀 Quick Review Script

Use the provided script to run all checks:

```bash
./review-before-deploy.sh
```

