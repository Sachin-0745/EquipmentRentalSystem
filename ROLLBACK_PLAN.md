# Database Migration Rollback Plan (MongoDB → MySQL)

In the event of a critical failure during or immediately after the migration to MongoDB, this rollback plan ensures zero data loss and an immediate return to the stable MySQL environment.

## Phase 1: Immediate API Reversion
1. In the `Backend/.env` file, comment out or remove the `MONGO_URI` configuration if necessary, though the application should be configured to gracefully degrade if the switch hasn't fully taken place.
2. In `server.js`, revert the `connectMongoDB();` initialization.
3. Re-point your DNS or load balancer to the previous production deployment running the SQL backend, OR revert your git branch to the pre-migration commit (`git checkout main` or equivalent).
4. Restart the Node.js server (`npm start`). The API will instantly resume reading and writing to MySQL.

## Phase 2: Data Reconciliation (If MongoDB took live writes)
If MongoDB was live and accepted new user data (rentals, reviews, etc.) before the failure occurred:
1. Identify the timestamp when the migration occurred.
2. We must write a reverse-ETL script to pull all MongoDB documents created *after* the migration timestamp.
3. Insert these new documents manually into the MySQL database. Since MongoDB `ObjectId`s are strings, any new records will require new auto-incrementing integers in MySQL. You must update foreign key mappings accordingly before inserting child records (like rentals).

## Phase 3: Post-Mortem Analysis
1. Review `migration_errors.log` to identify exactly which documents failed to migrate.
2. Check MongoDB Atlas performance metrics to ensure the Replica Set was not overloaded (which can cause transaction failures).
3. Fix the mapping bugs in `migrate_sql_to_mongo.js` before attempting the migration a second time.

## Quick Rollback Command (Codebase Reversion)
```bash
git checkout stable-mysql-branch
npm install
pm2 restart server
```
