# RoseRam Builder - Quick Start Guide

Get started with RoseRam Builder in 5 minutes.

---

## 1. Initial Setup (30 seconds)

### Prerequisites
- GitHub account with repositories
- Web browser

### Navigate to Builder
```
https://your-app.com/builder
```

You'll see the welcome screen with:
- "Connect Repository" button
- "New Repository" button (after connected)
- Settings and Session management icons

---

## 2. Connect Your First Repository (1 minute)

### Steps:
1. **Click "Connect Repository"** (top right button)
2. **Authorize GitHub** (click green button, follow GitHub prompts)
3. **Select a repository** from your GitHub account
4. **Done!** Files load automatically

### What Happens:
- ✅ File explorer populates (left sidebar)
- ✅ Frameworks detected (React, Vue, TypeScript, etc.)
- ✅ Dependencies analyzed
- ✅ Preview ready

---

## 3. Edit Your First File (2 minutes)

### Steps:
1. **Click a file** in the left sidebar (e.g., `index.html`)
2. **Edit the code** in the center panel
3. **Click "Save"** button (green, bottom of editor)
4. **Watch preview update** (right panel)

### Tips:
- Changes save to memory immediately
- Preview refreshes automatically
- All changes tracked in revision history
- You can undo/redo via history panel

---

## 4. Use AI Assistant (1 minute)

### Steps:
1. **Open chat panel** (left side, "AI Assistant")
2. **Type a request:**
   ```
   Add a dark mode toggle to the header
   Make the button more colorful
   Create a contact form component
   ```
3. **Press Ctrl+Enter** or click send
4. **Review the changes** in diff preview
5. **Click "Apply"** to accept changes

### Important:
- Grok only helps with YOUR codebase
- Be specific ("add to the header" not just "add dark mode")
- Grok understands your project's frameworks
- Changes appear in preview immediately

---

## 5. Push to GitHub (1 minute)

### For New Repository:
1. **Click "New Repository"** button (top right)
2. **Enter repository name** (e.g., "my-awesome-app")
3. **Add description** (optional)
4. **Choose public/private**
5. **Click "Create Repository"**
6. **Review files** to push
7. **Click "Push Files Now"**
8. **Done!** Repo created and files pushed

### For Existing Repository:
- Changes saved in current memory
- Switch to Git desktop app for git push
- Or use "New Repository" to create backup

---

## 6. Session Management (30 seconds)

### Manage Session:
1. **Click Package Icon** (top right, session settings)
2. **Session panel opens** showing:
   - Your email/ID
   - Connected repository
   - Detected frameworks
   - Project dependencies

### Add Personal X.AI Key:
1. **Paste your X.AI API key** in text field
2. **Click "Save Key"**
3. ✅ Uses your personal key (not global one)
4. **Clear** to remove anytime

### Clear Everything:
1. **Click "Clear All Session Data"**
2. **Confirm** (this resets everything)
3. ✅ Conversation history cleared
4. ✅ Files reset
5. ✅ Preferences reset
6. Fresh start!

---

## Common Tasks

### Task: Add a New Feature
```
1. Use AI: "Add login page"
2. Review diff
3. Apply changes
4. Save
5. Preview updated automatically
```

### Task: Fix a Bug
```
1. Open the file with bug
2. Edit or ask AI: "Fix the bug in this component"
3. Review changes
4. Apply
5. Test in preview
```

### Task: Add Library
```
1. Tell AI: "Add tailwind CSS to this project"
2. Grok suggests adding tailwindcss
3. Review dependencies panel
4. Apply changes
5. Done!
```

### Task: Share on GitHub
```
1. Click "New Repository"
2. Create repo
3. Push files
4. Share URL with others
5. They can clone and work on it
```

### Task: Start Fresh
```
1. Click Session icon (package icon)
2. Click "Clear All Session Data"
3. Confirm deletion
4. Page reloads with clean slate
5. Reconnect repo to continue
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Send AI message |
| `Ctrl+S` | Save current file |
| `Ctrl+Z` | Undo (in code) |
| `Ctrl+Y` | Redo (in code) |
| `Tab` | Indent code |
| `Shift+Tab` | Unindent code |

---

## Tips & Tricks

### Tip 1: Use Clear Prompts
```
❌ Bad: "Add a button"
✅ Good: "Add a submit button to the contact form with blue background"
```

### Tip 2: Review Before Applying
- Always check diff before applying AI changes
- Makes sure it matches your intent
- Can reject if needed

### Tip 3: Work Iteratively
```
1. Add feature 1 → Test → Push
2. Add feature 2 → Test → Push
3. Fix bugs → Test → Push
```

### Tip 4: Check Detected Frameworks
- Session panel shows what's detected
- Helps AI understand your stack
- Suggests missing dependencies

### Tip 5: Use File Preview
- Language badge shows file type
- Colors help identify files
- Useful for navigation

---

## Troubleshooting

### Q: Files won't load
**A:** Check GitHub token is valid, has repo access, and isn't expired.
- Click Settings (gear icon)
- Reconnect GitHub
- Select repo again

### Q: Grok won't respond
**A:** Make sure your request relates to your codebase.
- ✅ "Add button to navbar"
- ❌ "Teach me JavaScript"

### Q: Preview not updating
**A:** Try clicking refresh button (circular arrow)
- Or save file again
- Or check browser console for errors

### Q: Lost my changes
**A:** Changes are auto-saved to memory
- If you closed without pushing, they're gone
- Always push to GitHub before closing
- Use "New Repository" to save backup

### Q: Can't create repository
**A:** GitHub token needs repo scope
- In GitHub settings: Developer Settings → Personal Access Tokens
- Ensure "repo" checkbox is checked
- Regenerate if needed

---

## What Gets Saved?

### Saved to Database:
- ✅ Session API keys (encrypted)
- ✅ User preferences
- ✅ Conversation history
- ✅ Revision history

### Saved to GitHub:
- ✅ Files you push
- ✅ Commit history
- ✅ Branch information

### Saved Locally (Memory Only):
- ✅ File contents while editing
- ✅ Preview state
- ✅ Chat messages (per session)

### NOT Saved:
- ❌ Unsaved edits (close without saving = lost)
- ❌ Session after clear (completely wiped)
- ❌ API keys (after logout)

---

## Next Steps

### After Completing Quick Start:
1. **Explore**: Open different files, edit code
2. **Experiment**: Try different AI prompts
3. **Create**: Build something new or improve existing
4. **Share**: Push to GitHub and share with others

### Learn More:
- Read `BUILDER_SYSTEM_COMPLETE.md` for full documentation
- Check API endpoints reference
- Explore component prop types

### Get Help:
- Check troubleshooting section above
- Review error messages in preview
- Check browser console (F12)
- Create GitHub issue for bugs

---

## Keyboard Cheat Sheet

```
Navigation:
- Click file → Opens in editor
- Tab → Switch between panels
- Shift+Tab → Reverse direction

Editing:
- Ctrl+S → Save file
- Ctrl+A → Select all
- Ctrl+Z/Y → Undo/Redo
- Ctrl+F → Find

Chat:
- Ctrl+Enter → Send message
- Up/Down arrows → Message history

Preview:
- Ctrl+R → Refresh preview
- Click "Open in new tab" → Full screen
```

---

## System Requirements

### Browser:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Internet:
- Stable connection
- 1+ Mbps recommended
- GitHub access required

### Device:
- Desktop/Laptop recommended
- 4GB RAM minimum
- 1920x1080 resolution+ ideal

---

## Common Errors & Fixes

### Error: "No GitHub Token"
```
Fix: Click "Connect Repository" → Authorize GitHub
```

### Error: "File not found"
```
Fix: Refresh browser → Files should reload
```

### Error: "API Key Invalid"
```
Fix: Check X.AI key in Settings → Re-save key
```

### Error: "Preview not loading"
```
Fix: Click preview refresh button → Wait a moment
```

---

## You're Ready!

You now know enough to:
- ✅ Sync repositories
- ✅ Edit code
- ✅ Use AI assistant
- ✅ Push to GitHub
- ✅ Manage sessions
- ✅ Troubleshoot issues

**Start building!** 🚀

---

*Need detailed information?* → Read `BUILDER_SYSTEM_COMPLETE.md`
*Building for Builder.io?* → Check `BUILDER_IO_INTEGRATION_GUIDE.md`
*Lost?* → Return to this guide for refresher
