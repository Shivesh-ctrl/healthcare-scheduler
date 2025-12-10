# 💻 VS Code Guide - Working with Healthcare Scheduler

## 🚀 Getting Started in VS Code

### **Step 1: Open Project in VS Code**

**Option A: From VS Code**
1. Open VS Code
2. Click **File** → **Open Folder** (or `Cmd+O` on Mac, `Ctrl+O` on Windows)
3. Navigate to: `/Users/shiveshsrivastava/Desktop/healthcare-scheduler`
4. Click **Open**

**Option B: From Terminal**
```bash
cd /Users/shiveshsrivastava/Desktop/healthcare-scheduler
code .
```

**Option C: Drag & Drop**
- Drag the `healthcare-scheduler` folder onto VS Code icon

---

## 📁 Understanding the Project Structure in VS Code

### **Explorer Panel (Left Sidebar)**

```
📁 healthcare-scheduler/
├── 📁 backend/                    # Backend code
│   ├── 📁 supabase/
│   │   ├── 📁 functions/         # Edge Functions (API endpoints)
│   │   │   ├── 📁 handle-chat/
│   │   │   │   └── 📄 index.ts  # AI chat handler
│   │   │   ├── 📁 book-appointment/
│   │   │   │   └── 📄 index.ts  # Booking logic
│   │   │   └── 📁 _shared/      # Shared code
│   │   └── 📁 migrations/       # Database migrations
│   └── 📄 .env                   # Backend environment variables
│
├── 📁 frontend/                  # Frontend code
│   ├── 📁 src/
│   │   ├── 📁 components/      # React components
│   │   │   ├── 📄 ChatInterface.tsx
│   │   │   ├── 📄 SignUp.tsx
│   │   │   └── 📄 AdminDashboard.tsx
│   │   ├── 📁 lib/              # API clients
│   │   │   └── 📄 supabase.ts   # Backend API calls
│   │   └── 📄 App.tsx           # Main app
│   └── 📄 package.json          # Frontend dependencies
│
└── 📄 README.md
```

**Tip:** Use `Cmd+B` (Mac) or `Ctrl+B` (Windows) to toggle the sidebar

---

## ✏️ Editing Files in VS Code

### **Opening Files**

1. **Click file in Explorer** (left sidebar)
2. **Or use Quick Open:**
   - Press `Cmd+P` (Mac) or `Ctrl+P` (Windows)
   - Type filename (e.g., `ChatInterface.tsx`)
   - Press Enter

### **Editing Backend Code**

**Example: Edit AI Chat Handler**

1. **Open file:**
   - Press `Cmd+P` → Type `handle-chat/index.ts` → Enter
   - Or navigate: `backend/supabase/functions/handle-chat/index.ts`

2. **Make changes:**
   ```typescript
   // Find this line (around line 200):
   const aiResponse = await generateAIResponse(message)
   
   // Change to:
   const aiResponse = await generateAIResponse(message)
   console.log('AI Response:', aiResponse) // Add logging
   ```

3. **Save:** `Cmd+S` (Mac) or `Ctrl+S` (Windows)

### **Editing Frontend Code**

**Example: Change Chat UI**

1. **Open file:**
   - Press `Cmd+P` → Type `ChatInterface.tsx` → Enter

2. **Make changes:**
   ```typescript
   // Find a div element and change its className
   // BEFORE:
   <div className="bg-white p-4">
   
   // AFTER:
   <div className="bg-blue-100 p-4 shadow-md">
   ```

3. **Save:** `Cmd+S` or `Ctrl+S`

---

## 🖥️ Using VS Code Terminal

### **Open Terminal**

**Method 1: Keyboard Shortcut**
- Press `` Ctrl+` `` (backtick key, usually above Tab)

**Method 2: Menu**
- **Terminal** → **New Terminal**

**Method 3: Command Palette**
- Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows)
- Type "Terminal: Create New Terminal"

### **Terminal Tips**

1. **Multiple Terminals:**
   - Click **"+"** button in terminal panel
   - Or press `` Ctrl+Shift+` ``

2. **Split Terminal:**
   - Right-click terminal tab → **Split Terminal**

3. **Terminal for Backend:**
   ```bash
   cd backend
   # Now you can run backend commands
   ```

4. **Terminal for Frontend:**
   ```bash
   cd frontend
   # Now you can run frontend commands
   ```

---

## 🚀 Running Commands from VS Code

### **Deploy Backend Function**

1. **Open Terminal** (`` Ctrl+` ``)
2. **Navigate to backend:**
   ```bash
   cd backend
   ```
3. **Deploy function:**
   ```bash
   supabase functions deploy handle-chat --project-ref ljxugwfzkbjlrjwpglnx
   ```

### **Run Frontend Locally**

1. **Open Terminal** (`` Ctrl+` ``)
2. **Navigate to frontend:**
   ```bash
   cd frontend
   ```
3. **Start dev server:**
   ```bash
   npm run dev
   ```
4. **VS Code will show:**
   - Terminal output
   - Click the URL to open in browser

### **Deploy Frontend (via Git)**

1. **Open Terminal** (`` Ctrl+` ``)
2. **Navigate to project root:**
   ```bash
   cd /Users/shiveshsrivastava/Desktop/healthcare-scheduler
   ```
3. **Commit and push:**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

---

## 🔍 Useful VS Code Features

### **1. Search in Files**

**Find text across all files:**
- Press `Cmd+Shift+F` (Mac) or `Ctrl+Shift+F` (Windows)
- Type search term
- See all matches across project

**Example:** Search for "handle-chat" to find all references

### **2. Go to Definition**

**Jump to where a function/component is defined:**
- Right-click on function name → **Go to Definition**
- Or `Cmd+Click` (Mac) or `Ctrl+Click` (Windows)

**Example:** Click on `chatAPI.sendMessage` to see its definition

### **3. Find All References**

**See where a function/component is used:**
- Right-click → **Find All References**
- Or `Shift+F12`

### **4. Multi-Cursor Editing**

**Edit multiple lines at once:**
- `Option+Click` (Mac) or `Alt+Click` (Windows) to add cursor
- Type to edit all at once

### **5. Code Formatting**

**Auto-format code:**
- `Shift+Option+F` (Mac) or `Shift+Alt+F` (Windows)
- Or right-click → **Format Document**

---

## 📦 Recommended VS Code Extensions

### **Essential Extensions**

1. **ES7+ React/Redux/React-Native snippets**
   - Helps with React code
   - Install: Search "ES7+ React" in Extensions

2. **Prettier - Code formatter**
   - Auto-formats code
   - Install: Search "Prettier" in Extensions

3. **ESLint**
   - Finds code errors
   - Install: Search "ESLint" in Extensions

4. **Deno** (for backend TypeScript)
   - Helps with Deno/Edge Functions
   - Install: Search "Deno" in Extensions

5. **GitLens**
   - Better Git integration
   - Install: Search "GitLens" in Extensions

### **How to Install Extensions**

1. Click **Extensions** icon (left sidebar, looks like 4 squares)
2. Search for extension name
3. Click **Install**

---

## 🐛 Debugging in VS Code

### **Debug Frontend (React)**

1. **Install Debugger Extension:**
   - Install "Debugger for Chrome" or "Debugger for Edge"

2. **Create Launch Configuration:**
   - Press `Cmd+Shift+P` → Type "Debug: Add Configuration"
   - Select "Chrome" or "Edge"
   - VS Code creates `.vscode/launch.json`

3. **Start Debugging:**
   - Press `F5` or click **Run and Debug** (left sidebar)
   - Set breakpoints by clicking left of line numbers

### **Debug Backend (Edge Functions)**

**Note:** Edge Functions run on Supabase, so debugging is limited. Use:
- `console.log()` statements
- Check logs in Supabase Dashboard

---

## 📝 Common Tasks in VS Code

### **Task 1: Edit Backend Function**

1. Press `Cmd+P` → Type `handle-chat/index.ts`
2. Make your changes
3. Save (`Cmd+S`)
4. Open Terminal (`` Ctrl+` ``)
5. Run: `cd backend && supabase functions deploy handle-chat --project-ref ljxugwfzkbjlrjwpglnx`

### **Task 2: Edit Frontend Component**

1. Press `Cmd+P` → Type `ChatInterface.tsx`
2. Make your changes
3. Save (`Cmd+S`)
4. Open Terminal (`` Ctrl+` ``)
5. Run: `cd frontend && npm run dev`
6. Test in browser

### **Task 3: Search for Code**

1. Press `Cmd+Shift+F`
2. Type search term (e.g., "patient_email")
3. See all occurrences
4. Click to jump to file

### **Task 4: View Git Changes**

1. Click **Source Control** icon (left sidebar, looks like branch)
2. See all changed files
3. Click file to see diff
4. Stage changes (click "+")
5. Commit (type message, press `Cmd+Enter`)

---

## ⌨️ Essential Keyboard Shortcuts

### **Navigation**
- `Cmd+P` (Mac) / `Ctrl+P` (Windows) - Quick Open file
- `Cmd+Shift+P` - Command Palette
- `Cmd+B` - Toggle sidebar
- `Ctrl+` ` ` - Toggle terminal

### **Editing**
- `Cmd+S` - Save file
- `Cmd+Z` - Undo
- `Cmd+Shift+Z` - Redo
- `Cmd+F` - Find in file
- `Cmd+Shift+F` - Find in all files
- `Shift+Option+F` - Format document

### **Code Navigation**
- `Cmd+Click` - Go to definition
- `Shift+F12` - Find all references
- `Cmd+Shift+O` - Go to symbol in file

### **Terminal**
- `` Ctrl+` `` - Toggle terminal
- `Cmd+K` - Clear terminal

---

## 🎯 Workflow Example: Change Chat Response

### **Step-by-Step in VS Code**

1. **Open the file:**
   - Press `Cmd+P`
   - Type: `handle-chat/index.ts`
   - Press Enter

2. **Find the code:**
   - Press `Cmd+F`
   - Type: `generateAIResponse`
   - Press Enter

3. **Make changes:**
   - Edit the code around that line
   - Add your custom logic

4. **Save:**
   - Press `Cmd+S`

5. **Deploy:**
   - Open Terminal (`` Ctrl+` ``)
   - Type: `cd backend`
   - Type: `supabase functions deploy handle-chat --project-ref ljxugwfzkbjlrjwpglnx`
   - Press Enter

6. **Done!** ✅

---

## 🔧 VS Code Settings (Optional)

### **Enable Auto-Save**

1. Press `Cmd+,` (Mac) or `Ctrl+,` (Windows) to open Settings
2. Search: "auto save"
3. Select: "afterDelay" or "onFocusChange"

### **Change Font Size**

1. Press `Cmd+,` to open Settings
2. Search: "font size"
3. Adjust to your preference (default: 14)

### **Enable Word Wrap**

1. Press `Cmd+,` to open Settings
2. Search: "word wrap"
3. Select: "on"

---

## 📚 Quick Reference

### **File Navigation**
- `Cmd+P` - Open file quickly
- `Cmd+Shift+E` - Focus Explorer
- `Cmd+K Cmd+S` - Keyboard shortcuts

### **Code Editing**
- `Cmd+/` - Toggle comment
- `Option+Up/Down` - Move line up/down
- `Shift+Option+Up/Down` - Copy line up/down

### **Terminal**
- `` Ctrl+` `` - Toggle terminal
- `Cmd+K` - Clear terminal
- `Cmd+\` - Split terminal

---

## 🎉 Tips & Tricks

1. **Use Command Palette:**
   - `Cmd+Shift+P` opens all commands
   - Type what you want to do

2. **Use Breadcrumbs:**
   - Bottom of editor shows file path
   - Click to navigate

3. **Use Minimap:**
   - Right side shows code overview
   - Click to jump to section

4. **Use Split View:**
   - Right-click file tab → **Split Right**
   - Compare files side-by-side

5. **Use Snippets:**
   - Type `console.log` → Press Tab
   - Auto-completes to `console.log()`

---

## 🆘 Troubleshooting

### **Terminal Not Working?**
- Check if you're in the right directory
- Try opening new terminal: `` Ctrl+Shift+` ``

### **File Not Found?**
- Use `Cmd+P` to search
- Check if you're in the right workspace

### **Code Not Formatting?**
- Install Prettier extension
- Press `Shift+Option+F` to format manually

### **Git Not Working?**
- Check if Git is installed: `git --version`
- Check if you're in a Git repository

---

That's everything you need to work with this project in VS Code! 🎉

