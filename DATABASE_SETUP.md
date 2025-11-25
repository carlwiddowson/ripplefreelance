# PostgreSQL Database Setup

Your PostgreSQL server is running, but it requires password authentication. Here are your options:

## Option 1: Use Your Existing PostgreSQL (Recommended)

### Step 1: Set PostgreSQL Password

If you haven't set a password yet, do this:

```bash
# Set password for your user
psql postgres
```

Then in the psql prompt:
```sql
ALTER USER carl WITH PASSWORD 'your_password_here';
\q
```

### Step 2: Create Database

```bash
# Using your user with password
psql postgres -c "CREATE DATABASE ripplefreelance;"
```

Or enter psql and create manually:
```bash
psql postgres
```
```sql
CREATE DATABASE ripplefreelance;
\l  -- List databases to verify
\q
```

### Step 3: Update .env File

Edit `/Users/carl/Documents/ripplefreelance/backend/.env`:

```bash
DATABASE_URL=postgresql://carl:your_password_here@localhost:5432/ripplefreelance
```

### Step 4: Run Migration

```bash
cd /Users/carl/Documents/ripplefreelance/backend
npm run migrate
```

---

## Option 2: Enable Trust Authentication (Development Only)

⚠️ **Only for local development!**

### Step 1: Find PostgreSQL Config

```bash
psql postgres -c "SHOW hba_file;"
```

### Step 2: Edit pg_hba.conf

```bash
# The file is usually at:
# /opt/homebrew/var/postgresql@14/pg_hba.conf (Homebrew)
# or /usr/local/var/postgresql@14/pg_hba.conf

# Edit with nano or vim
nano $(psql postgres -t -c "SHOW hba_file;")
```

### Step 3: Change Authentication Method

Find lines like:
```
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
```

Change `md5` to `trust`:
```
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
```

### Step 4: Restart PostgreSQL

```bash
brew services restart postgresql@14
```

### Step 5: Create Database (No Password Needed)

```bash
createdb ripplefreelance
```

### Step 6: Update .env

```bash
DATABASE_URL=postgresql://carl@localhost:5432/ripplefreelance
```

### Step 7: Run Migration

```bash
cd /Users/carl/Documents/ripplefreelance/backend
npm run migrate
```

---

## Option 3: Use SQLite (Quick Testing)

For rapid testing without PostgreSQL setup:

### Step 1: Install SQLite Package

```bash
npm install better-sqlite3
```

### Step 2: Update .env

```bash
DATABASE_URL=sqlite:./ripplefreelance.db
```

### Step 3: Update Database Code

Modify `src/db/index.ts` to support SQLite (requires code changes).

---

## Option 4: Use Supabase (Free Cloud Database)

### Step 1: Create Supabase Account

Visit https://supabase.com and create a free account.

### Step 2: Create New Project

- Click "New Project"
- Name: "ripplefreelance"
- Database Password: (set a strong password)
- Region: Choose closest to you

### Step 3: Get Connection String

In Supabase dashboard:
- Go to Settings → Database
- Copy "Connection string" under "Connection string"
- It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`

### Step 4: Update .env

```bash
DATABASE_URL=postgresql://postgres:your_password@db.xxx.supabase.co:5432/postgres
```

### Step 5: Run Migration

```bash
npm run migrate
```

✅ **Advantage**: No local PostgreSQL needed, free tier includes 500MB database!

---

## Troubleshooting

### Error: "password authentication failed"

**Solution**: You need to either:
1. Set a password for your PostgreSQL user (Option 1)
2. Enable trust authentication (Option 2)
3. Use cloud database (Option 4)

### Error: "database already exists"

If database exists but migration fails:
```bash
# Drop and recreate
psql postgres -c "DROP DATABASE IF EXISTS ripplefreelance;"
psql postgres -c "CREATE DATABASE ripplefreelance;"
npm run migrate
```

### Check PostgreSQL Status

```bash
# Check if running
pg_isready

# Start PostgreSQL (if not running)
brew services start postgresql@14

# Restart PostgreSQL
brew services restart postgresql@14

# Check version
psql postgres -c "SELECT version();"
```

### List Existing Databases

```bash
psql postgres -c "\l"
```

---

## Recommended Approach for Week 1

**Option 4 (Supabase)** is recommended because:
- ✅ No local config needed
- ✅ Free tier is generous
- ✅ Works immediately
- ✅ Same PostgreSQL as production
- ✅ Built-in backups
- ✅ Web interface for debugging

Takes **5 minutes** to set up vs potentially hours debugging local PostgreSQL!

---

## Next Steps

Once your database is configured:

1. ✅ Database URL in `.env`
2. Run migration: `npm run migrate`
3. Start server: `npm run dev`
4. Test API: See `WEEK1_COMPLETE.md`

Need help? The error messages will tell you exactly what's wrong!
