# AI Scout Development Guide

> **READ THIS ENTIRE DOCUMENT BEFORE MAKING ANY CHANGES**

This guide ensures you never accidentally break the live site.

---

## Understanding the Setup

### What We Have

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR COMPUTER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Local Development (http://localhost:3000)               │  │
│  │  - Where you write and test code                         │  │
│  │  - Changes here affect NOTHING online                    │  │
│  │  - Safe to experiment                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ git push
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          GITHUB                                  │
│  ┌────────────────────┐    ┌────────────────────┐              │
│  │   develop branch   │    │    main branch     │              │
│  │   (your work)      │    │    (PRODUCTION)    │              │
│  └────────────────────┘    └────────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
           │                              │
           │ auto-deploy                  │ auto-deploy
           ▼                              ▼
┌─────────────────────┐      ┌─────────────────────────────────┐
│   PREVIEW URL       │      │   LIVE SITE                     │
│   (temporary test)  │      │   ai-scout-jet.vercel.app       │
│   Safe to break     │      │   REVIEWERS SEE THIS            │
└─────────────────────┘      └─────────────────────────────────┘
```

### The Golden Rules

| Rule | Why |
|------|-----|
| Work on `develop` branch | Keeps live site safe |
| Test locally first | Catch bugs before they spread |
| Test preview URL | Catch deployment issues |
| Only merge to `main` when ready | Controls when live site updates |

---

## Before You Start Working

### Pre-Work Checklist

- [ ] Open terminal in ai-scout folder
- [ ] Check which branch you're on:
  ```bash
  git branch
  ```
- [ ] You should see `* develop` (asterisk means current branch)
- [ ] If you see `* main`, switch immediately:
  ```bash
  git checkout develop
  ```
- [ ] Pull latest changes:
  ```bash
  git pull origin develop
  ```
- [ ] Start local server:
  ```bash
  npm run dev
  ```
- [ ] Open http://localhost:3000 in browser
- [ ] Verify the site loads correctly

---

## Making Changes

### Step-by-Step Process

#### Step 1: Make Your Code Changes
- Edit files as needed
- Save files (Cmd+S or Ctrl+S)
- Browser should auto-refresh with changes

#### Step 2: Test Locally
- [ ] Does the feature work?
- [ ] Did you break anything else?
- [ ] Check multiple pages
- [ ] Test on different screen sizes if relevant

#### Step 3: Save to Git (Still Safe - Not Live Yet)

```bash
# See what files you changed
git status

# Add all changed files
git add .

# Commit with a message describing what you did
git commit -m "Your description here"
```

**Good commit messages:**
- "Fix mobile layout on dashboard"
- "Add player stats to reports page"
- "Update button color on home page"

**Bad commit messages:**
- "fix"
- "update"
- "changes"

#### Step 4: Push to Develop Branch (Still Safe - Creates Preview Only)

```bash
git push origin develop
```

This does NOT update the live site. It:
- Saves your code to GitHub
- Creates a preview URL on Vercel

#### Step 5: Check the Preview

1. Go to https://vercel.com/shawnrye1s-projects/ai-scout
2. Find the latest deployment for `develop` branch
3. Click the preview URL
4. Test everything works

**Preview Checklist:**
- [ ] Site loads without errors
- [ ] Your changes appear correctly
- [ ] Nothing else broke
- [ ] Test the feature thoroughly

---

## Deploying to Live Site

### Only Do This When:
- [ ] You've tested locally
- [ ] You've tested the preview URL
- [ ] You're confident the changes are ready
- [ ] It's a good time (not middle of reviewer demo)

### Deployment Steps

```bash
# Step 1: Switch to main branch
git checkout main

# Step 2: Pull any changes (in case someone else merged)
git pull origin main

# Step 3: Merge develop into main
git merge develop

# Step 4: Push to main (THIS UPDATES LIVE SITE)
git push origin main

# Step 5: Go back to develop for future work
git checkout develop
```

### Post-Deployment Checklist
- [ ] Go to https://ai-scout-jet.vercel.app
- [ ] Wait 1-2 minutes for deployment
- [ ] Verify the live site works correctly
- [ ] Test your changes on the live site

---

## Emergency Procedures

### "I Pushed Bad Code to Main!"

**Don't panic.** Here's how to fix it:

```bash
# Option 1: Revert the last commit (safest)
git checkout main
git revert HEAD
git push origin main
```

This creates a new commit that undoes your changes.

```bash
# Option 2: If multiple commits were bad
git log --oneline  # Find the last good commit hash
git revert HEAD~3..HEAD  # Reverts last 3 commits
git push origin main
```

### "I'm on the Wrong Branch!"

If you made changes on `main` by accident:

```bash
# Save your changes temporarily
git stash

# Switch to develop
git checkout develop

# Apply your changes here
git stash pop

# Now commit properly on develop
git add .
git commit -m "Your message"
git push origin develop
```

### "My Local Site Won't Start"

```bash
# Try these in order:

# 1. Make sure you're in the right folder
cd /Users/shawnearl/ai-scout

# 2. Install dependencies (if needed)
npm install

# 3. Start the server
npm run dev

# 4. If still broken, check for error messages
# 5. Check if .env file exists and has values
```

### "Preview URL Shows Errors"

1. Go to Vercel dashboard
2. Click on the failed deployment
3. Read the build logs
4. Common issues:
   - Missing environment variable → Add to Vercel
   - TypeScript error → Fix locally, push again
   - Import error → Check file paths

---

## Common Commands Reference

### Checking Status
```bash
git branch          # Which branch am I on?
git status          # What files changed?
git log --oneline   # What were recent commits?
```

### Switching Branches
```bash
git checkout develop   # Switch to develop
git checkout main      # Switch to main
```

### Saving Work
```bash
git add .                        # Stage all changes
git commit -m "message"          # Commit with message
git push origin develop          # Push to develop
git push origin main             # Push to main
```

### Undoing Mistakes
```bash
git checkout -- filename         # Undo changes to one file
git checkout -- .                # Undo all uncommitted changes
git reset --soft HEAD~1          # Undo last commit, keep changes
git stash                        # Temporarily save changes
git stash pop                    # Restore stashed changes
```

### Syncing with Remote
```bash
git pull origin develop          # Get latest develop
git pull origin main             # Get latest main
```

---

## Environment Variables

### Local Development (.env file)
Located at `/Users/shawnearl/ai-scout/.env`
- Used only on your computer
- Already configured
- Never commit this file to git

### Production (Vercel)
Configured in Vercel dashboard.
Current variables:
- POSTGRES_URL ✓
- AUTH_SECRET ✓
- GEMINI_API_KEY ✓
- CLOUDFLARE_R2_ACCESS_KEY ✓
- CLOUDFLARE_R2_SECRET_KEY ✓
- CLOUDFLARE_R2_BUCKET ✓
- CLOUDFLARE_R2_ENDPOINT ✓
- CLOUDFLARE_R2_PUBLIC_URL ✓
- ANTHROPIC_API_KEY ✓
- BASE_URL ✓
- NEXT_PUBLIC_APP_URL ✓

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    DAILY WORKFLOW                            │
├─────────────────────────────────────────────────────────────┤
│  1. git checkout develop                                    │
│  2. git pull origin develop                                 │
│  3. npm run dev                                             │
│  4. Make changes, test locally                              │
│  5. git add . && git commit -m "message"                    │
│  6. git push origin develop                                 │
│  7. Test preview URL                                        │
│  8. When ready: merge to main (see deployment steps)        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    DEPLOY TO LIVE                           │
├─────────────────────────────────────────────────────────────┤
│  1. git checkout main                                       │
│  2. git pull origin main                                    │
│  3. git merge develop                                       │
│  4. git push origin main                                    │
│  5. git checkout develop                                    │
│  6. Verify live site                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    EMERGENCY FIX                            │
├─────────────────────────────────────────────────────────────┤
│  git checkout main                                          │
│  git revert HEAD                                            │
│  git push origin main                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Contact & Resources

- **Live Site:** https://ai-scout-jet.vercel.app
- **Vercel Dashboard:** https://vercel.com/shawnrye1s-projects/ai-scout
- **GitHub Repo:** https://github.com/Shawnrye1/ai-scout
- **Local Dev:** http://localhost:3000
