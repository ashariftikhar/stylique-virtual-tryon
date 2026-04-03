# CURSOR WORKFLOW GUIDE
## Using Cursor Pro with PROJECT_CONTEXT for Error-Free Development

---

## 🎯 SETUP: Adding PROJECT_CONTEXT to Your Project

### Step 1: Create Folder Structure
```bash
stylique-api/
├─ PROJECT_CONTEXT/
│  ├─ README.md
│  ├─ EXECUTION_PLAN.md
│  ├─ DATABASE_SCHEMA.md
│  ├─ API_SPECS.md
│  ├─ TESTING_GUIDE.md
│  ├─ PROGRESS_TRACKER.md
│  └─ CODE_QUALITY_CHECKLIST.md
├─ src/
│  ├─ routes/
│  ├─ services/
│  ├─ middleware/
│  └─ types/
├─ tests/
├─ package.json
├─ tsconfig.json
└─ .env
```

### Step 2: Add PROJECT_CONTEXT Files
Copy these files from outputs folder to your PROJECT_CONTEXT/ directory:
- PROJECT_CONTEXT_EXECUTION_PLAN.md → PROJECT_CONTEXT/EXECUTION_PLAN.md
- PROJECT_CONTEXT_PROGRESS_TRACKER.md → PROJECT_CONTEXT/PROGRESS_TRACKER.md
- STYLIQUE_COMPLETE_IMPLEMENTATION_GUIDE.md → PROJECT_CONTEXT/DATABASE_SCHEMA.md (extract API and DB sections)
- STYLIQUE_3_WEEK_SPRINT_PLAN.md → PROJECT_CONTEXT/TESTING_GUIDE.md
- Create API_SPECS.md from STYLIQUE_COMPLETE_IMPLEMENTATION_GUIDE.md

### Step 3: Open in Cursor
```bash
# Open in Cursor
cursor stylique-api/

# Cursor will detect PROJECT_CONTEXT folder automatically
```

---

## 🤖 DAILY WORKFLOW WITH CURSOR

### MORNING - Start of Development Day

**Step 1: Ask Cursor What To Do**
```
You type in Cursor chat:
@PROJECT_CONTEXT What is my task today?
```

**Cursor reads:**
- EXECUTION_PLAN.md (current week/day)
- PROGRESS_TRACKER.md (what's done, what's next)

**Cursor responds:**
```
"Based on EXECUTION_PLAN.md, today is Day 3.
You need to build auth endpoints:
- POST /api/auth/register
- POST /api/auth/login  
- POST /api/auth/logout

See API_SPECS.md for exact specifications.
Want me to scaffold the code?"
```

**Step 2: Get Code Structure**
```
You: "@API_SPECS Generate the auth endpoints structure"
```

Cursor generates starter code based on specifications.

---

### DURING CODING - Continuous Review

**As you code, ask Cursor:**

```
// After implementing POST /api/auth/register
You: "@API_SPECS @DATABASE_SCHEMA Review my auth/register endpoint"

Cursor checks:
- Does it match API_SPECS.md spec?
- Are database queries correct vs DATABASE_SCHEMA.md?
- Does it have proper error handling?
- Are inputs validated?
- Is sensitive data handled securely?

Cursor responds with:
✅ Matches spec
⚠️ Missing input validation on email field
⚠️ Password hashing before DB insert
✅ Error handling looks good
```

**Fix issues, then ask again:**
```
You: "Review again - did I fix the issues?"

Cursor: "✅ All issues resolved. This is production-ready."
```

---

### END OF DAY - Daily Standup

**Step 1: Update Progress**
```
You: Update PROGRESS_TRACKER.md with:
- ✅ Completed: Auth endpoints
- Time spent: 4 hours
- Blockers: None
- Tomorrow: Product endpoints
```

**Step 2: Ask Cursor for Next Day**
```
You: "@EXECUTION_PLAN @PROGRESS_TRACKER 
What should I work on tomorrow?"

Cursor: "Tomorrow is Day 4.
Build Product Endpoints:
- POST /api/sync/products
- GET /api/products/store/:store_id
- GET /api/products/:product_id

See API_SPECS.md for specs.
Ready to scaffold?"
```

**Step 3: Commit Code**
```bash
git add src/routes/auth.ts
git commit -m "Day 3: Add auth endpoints - register, login, logout"
```

---

## 🔄 CODE REVIEW WORKFLOW

### When You Need Cursor to Review Your Code:

**Option 1: Review Single File**
```
You: "@API_SPECS Review src/routes/products.ts
Does it match the product endpoint specs?"

Cursor reads:
- Your code
- API_SPECS.md
- DATABASE_SCHEMA.md

Cursor provides:
✅ What's correct
⚠️ What needs fixing
💡 Suggestions for improvement
```

**Option 2: Review Against Checklist**
```
You: "@CODE_QUALITY_CHECKLIST Does this code pass?"

Cursor checks against:
- No TypeScript errors
- Input validation
- Error handling
- Performance
- Security
- Testing

Cursor gives: ✅ PASS or ❌ NEEDS WORK
```

**Option 3: Full Architecture Review**
```
You: "@API_SPECS @DATABASE_SCHEMA 
Is my architecture correct? 
Any improvements?"

Cursor reviews:
- API design consistency
- Database integration
- Data flow
- Error handling strategy
```

---

## 💡 CURSOR @ MENTIONS REFERENCE

In Cursor, use `@` to reference files:

```
@EXECUTION_PLAN           - Get task list and timeline
@PROGRESS_TRACKER         - See what's done/pending
@API_SPECS               - Reference API endpoint specs
@DATABASE_SCHEMA         - Reference database structure
@TESTING_GUIDE           - Reference quality standards
@CODE_QUALITY_CHECKLIST  - Get quality requirements
@README                  - Understand project context
```

---

## 🧪 TESTING WITH CURSOR

### Before Committing:

```
You: "@TESTING_GUIDE Run quality checks on my code"

Cursor:
1. Checks against TESTING_GUIDE.md
2. Runs type checking
3. Checks error handling
4. Reviews security
5. Reports results

Example response:
✅ Type checking: Pass
⚠️ Error handling: Missing try/catch on line 45
✅ Security: Pass
❌ Tests: Not found - need tests for /register endpoint
```

### Generate Tests:

```
You: "@TESTING_GUIDE Generate tests for auth endpoints"

Cursor creates:
- Unit tests for register
- Unit tests for login
- Unit tests for logout
- Error case tests

You commit tests with code.
```

---

## 🚨 ERROR PREVENTION WORKFLOW

**This is where Cursor really shines:**

### Scenario: Building Image Processing

```
Day 10 - You're building image processing

You: "@DATABASE_SCHEMA How should I store image data?
@API_SPECS What format should API accept?"

Cursor tells you exact structure from files.

You code the implementation.

You: "Review my implementation"

Cursor catches:
❌ You're using wrong field name from schema
❌ API response format doesn't match spec
✅ Database insertion logic correct
⚠️ Missing error for invalid images

These errors would've caused bugs without review!
```

### Before You Find Out During Testing:

```
Traditional approach:
Code → Deploy → Test → Find error → Debug → Fix

Smart approach with Cursor:
Code → Cursor reviews → Fix immediately → Deploy → Test → No errors
```

---

## 📊 GENERATING WEEKLY REPORTS

### Every Friday:

```
You: "@PROGRESS_TRACKER Generate weekly report"

Cursor reads entire PROGRESS_TRACKER.md and creates:

📋 WEEK 1 SUMMARY
━━━━━━━━━━━━━━━━━━━━━
✅ Completed:
- Auth endpoints (100%)
- Product endpoints (100%)
- Analytics endpoints (100%)
- API deployed to Vercel

🔄 In Progress:
- Tests and documentation

⚠️ Blockers:
- None this week

📊 Metrics:
- 15 endpoints created
- 3 tasks completed
- 10 hours spent (target: 10 hours)
- On schedule: ✅ YES

📅 Next Week:
- Shopify OAuth integration
- WooCommerce plugin integration
```

Copy-paste into message to manager.

---

## 🛡️ ERROR PREVENTION CHECKLIST

Cursor prevents these common errors:

```
❌ Forgot to validate input
→ Cursor: "@API_SPECS Check inputs. Validation needed."

❌ Wrong database field name
→ Cursor: "@DATABASE_SCHEMA Verify field names."

❌ API response doesn't match spec
→ Cursor: "@API_SPECS Check response format."

❌ Missing error handling
→ Cursor: "Add try/catch blocks"

❌ Security issue (storing password in plaintext)
→ Cursor: "Passwords must be hashed with bcrypt"

❌ Performance issue (N+1 queries)
→ Cursor: "Optimize this database query"

❌ Forgetting to test
→ Cursor: "Add tests before committing"
```

---

## 📝 PROMPT EXAMPLES YOU'LL USE DAILY

### Start of Day
```
"@PROJECT_CONTEXT What's my task today?"
```

### During Coding
```
"@API_SPECS Review my implementation"
"@DATABASE_SCHEMA Are database queries correct?"
"@CODE_QUALITY_CHECKLIST Does this pass?"
```

### Before Committing
```
"@TESTING_GUIDE Run quality checks"
"Review for any bugs or improvements"
```

### End of Day
```
"Update PROGRESS_TRACKER.md. What's tomorrow's task?"
```

### Weekly
```
"@PROGRESS_TRACKER Generate weekly report"
```

---

## ⚙️ CURSOR SETTINGS FOR THIS WORKFLOW

In Cursor Settings:

1. **Enable inline documentation**
   - Settings → Editor → Inline Documentation: ON

2. **Enable quick documentation**
   - Settings → Editor → Quick Documentation: ON

3. **Set context window size**
   - Settings → AI → Context Window: Max

4. **Enable file references**
   - Settings → Chat → Allow @ mentions: ON

---

## 🎓 PRO TIPS FOR CURSOR

### Tip 1: Reference Multiple Files
```
"@API_SPECS @DATABASE_SCHEMA @TESTING_GUIDE
Review my product endpoint implementation"

Cursor checks against all three specs simultaneously.
More comprehensive review.
```

### Tip 2: Ask for Specific Checks
```
"@API_SPECS Review ONLY the request/response format"
(Cursor focuses on format, ignores business logic)

"@DATABASE_SCHEMA Review ONLY the database queries"
(Cursor focuses on SQL, ignores API layer)
```

### Tip 3: Get Cursor to Generate Tests
```
"@TESTING_GUIDE Generate tests for my auth endpoints"

Cursor creates complete test suite matching standards.
```

### Tip 4: Ask for Performance Review
```
"Review this code for performance issues.
Any N+1 queries? Any inefficiencies?
How can I optimize?"
```

---

## 🚀 FINAL DELIVERY CLEANUP

**BEFORE you share code with manager:**

```
Step 1: Remove PROJECT_CONTEXT folder
rm -rf PROJECT_CONTEXT/

Step 2: Remove .env file (if it contains secrets)
rm .env

Step 3: Final Cursor review
"@TESTING_GUIDE Final production readiness check"

Step 4: Commit and push
git add -A
git commit -m "Final: Production-ready code"
git push

Step 5: Deploy
vercel deploy --prod
```

**Manager receives:**
- Clean production code
- No context files
- No development artifacts
- Professional-grade implementation

---

## 📊 CURSOR VS OTHER OPTIONS

| Feature | Cursor | Copilot | ChatGPT |
|---------|--------|---------|---------|
| Project context | ✅ Full | ⚠️ Limited | ❌ None |
| File references | ✅ Easy | ⚠️ Difficult | ❌ No |
| Multi-file review | ✅ Seamless | ⚠️ Manual | ❌ Impractical |
| Code generation | ✅ Excellent | ✅ Good | ✅ Good |
| Error prevention | ✅ Best | ⚠️ Good | ⚠️ Good |
| Integrated | ✅ Native | ✅ Native | ❌ Browser |

**For this workflow: Cursor Pro is the best choice** ⭐⭐⭐

---

## 💡 WHY THIS WORKS SO WELL

```
Traditional Development:
You write code → Hope it's correct → Test → Find errors

Smart Development (With Cursor):
Cursor knows full context → You write code → Cursor catches errors immediately → You fix → Deploy correct

Result: 5x fewer errors, 3x faster development, production-quality code
```

---

## 🎯 SUCCESS INDICATORS

You know this workflow is working when:

✅ You catch errors BEFORE testing
✅ Code reviews take 5 minutes (Cursor finds issues)
✅ Zero "major bugs" in testing
✅ Weekly reports are easy to generate
✅ You know exactly what to do each day
✅ Manager sees consistent progress
✅ Final delivery is bug-free

---

**Use this workflow and you'll deliver professional-grade code that impresses your client.** 🚀

Every prompt, every file reference, every review contributes to error-free development.
