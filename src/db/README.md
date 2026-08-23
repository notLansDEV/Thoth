# Thoth Database Layer

This directory contains all database-related code for the Thoth application, including connection management, schema definitions, and data repositories.

## Directory Structure

```
db/
├── database.js              # Database connection and query helpers
├── schema.sql               # Full database schema definition
├── migrations/              # Database migration scripts
│   └── 001_initial_schema.sql
├── repositories/            # Data access layer
│   ├── base.repository.js
│   ├── project.repository.js
│   ├── task.repository.js
│   ├── bug.repository.js
│   ├── milestone.repository.js
│   ├── report.repository.js
│   ├── workspace.repository.js
│   ├── activity.repository.js
│   └── index.js
└── README.md               # This file
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

The `pg` package is already included in `package.json`.

### 2. Configure Environment

Create a `.env.local` file in the root directory:

```env
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=thoth
```

### 3. Create Database

```sql
-- Connect to PostgreSQL as admin
psql -U postgres

-- Create the database
CREATE DATABASE thoth;

-- Exit
\q
```

### 4. Initialize Schema

```javascript
// In your application startup code
import { initializeDatabase, initializeSchema } from './db/database.js';

async function setupDatabase() {
  try {
    initializeDatabase();
    await initializeSchema();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

setupDatabase();
```

## Using Repositories

### Import Repositories

```javascript
import {
  projectRepository,
  taskRepository,
  bugRepository,
  milestoneRepository,
  reportRepository,
  workspaceRepository,
  activityRepository
} from './db/repositories/index.js';
```

### Common Operations

#### Create
```javascript
const newProject = await projectRepository.create({
  workspace_id: workspaceId,
  name: 'My Project',
  slug: 'my-project',
  description: 'Project description'
});
```

#### Read
```javascript
const project = await projectRepository.findById(projectId);
const projects = await projectRepository.findAll();
```

#### Update
```javascript
const updated = await projectRepository.updateById(projectId, {
  name: 'Updated Project Name',
  status: 'active'
});
```

#### Delete
```javascript
const deleted = await projectRepository.deleteById(projectId);
```

#### Search/Filter
```javascript
const activeTasks = await taskRepository.findByProject(projectId, {
  status: 'in_progress',
  priority: 'high'
});
```

## Repository Methods

Each repository extends BaseRepository and provides CRUD operations plus entity-specific methods.

### BaseRepository Methods

- `findById(id)` - Get record by ID
- `findAll(orderBy, limit, offset)` - Get all records with pagination
- `findByCondition(whereClause, params, orderBy)` - Query with WHERE clause
- `create(data)` - Create new record
- `updateById(id, data)` - Update record
- `deleteById(id)` - Delete record
- `count()` - Count all records
- `countByCondition(whereClause, params)` - Count with condition

### Specialized Methods

#### ProjectRepository
- `findByWorkspace(workspaceId, includeArchived)` - Find projects in workspace
- `findBySlug(workspaceId, slug)` - Find project by slug
- `getStats(projectId)` - Get task and bug statistics

#### TaskRepository
- `findByProject(projectId, filters)` - Find tasks with filters
- `findSubtasks(parentTaskId)` - Get subtasks
- `getWithSubtasks(taskId)` - Get task with all subtasks
- `complete(taskId)` - Mark task as completed
- `getDueSoon(projectId, days)` - Get tasks due soon
- `getOverdue(projectId)` - Get overdue tasks
- `bulkUpdateStatus(taskIds, status)` - Update multiple tasks

#### BugRepository
- `findByProject(projectId, filters)` - Find bugs with filters
- `findByKanbanColumn(projectId, columnName)` - Get bugs in kanban column
- `generateBugId(projectId, kanbanColumn)` - Generate unique bug ID
- `getWithComments(bugId)` - Get bug with all comments
- `addComment(bugId, authorId, content, attachments)` - Add comment to bug
- `updateKanbanColumn(bugId, kanbanColumn)` - Move bug to column
- `getHighPriority(projectId)` - Get critical bugs

#### MilestoneRepository
- `findByProject(projectId, includeCompleted)` - Find milestones
- `getWithTasks(milestoneId)` - Get milestone with tasks
- `getProgress(milestoneId)` - Calculate progress percentage
- `updateProgress(milestoneId)` - Update progress
- `getUpcoming(projectId, days)` - Get upcoming milestones

#### ReportRepository
- `findByProject(projectId, limit, offset)` - Get paginated reports
- `getByDate(projectId, reportDate)` - Get report for specific date
- `getLatest(projectId)` - Get most recent report
- `generateDailyReport(projectId, reportDate)` - Generate/update daily report
- `getSummary(projectId, days)` - Get report summary for period

#### WorkspaceRepository
- `findBySlug(slug)` - Find workspace by slug
- `getWithProjects(workspaceId, includeArchived)` - Get workspace with projects
- `getMembers(workspaceId)` - Get workspace members
- `addMember(workspaceId, userId, role)` - Add user to workspace
- `removeMember(workspaceId, userId)` - Remove user from workspace
- `getStats(workspaceId)` - Get workspace statistics

#### ActivityRepository
- `log(workspaceId, entityType, action, entityId, actorId, changes, projectId)` - Log activity
- `getWorkspaceActivity(workspaceId, limit, offset)` - Get workspace activity
- `getProjectActivity(projectId, limit, offset)` - Get project activity
- `getEntityActivity(entityType, entityId)` - Get activity for entity
- `getByAction(workspaceId, action, limit)` - Get activities by action
- `getRecent(workspaceId, hours, limit)` - Get recent activities
- `cleanup(daysOld)` - Delete old activity logs

## Advanced Usage

### Transactions

```javascript
import { transaction } from './db/database.js';

const result = await transaction(async (client) => {
  // All operations in this callback are atomic
  const task = await taskRepository.create({...});
  await activityRepository.log(...);
  return task;
});
```

### Raw Queries

```javascript
import { query, getOne, getMany } from './db/database.js';

const result = await query('SELECT * FROM projects WHERE name = $1', ['My Project']);
const single = await getOne('SELECT * FROM projects WHERE id = $1', [projectId]);
const multiple = await getMany('SELECT * FROM tasks WHERE status = $1', ['todo']);
```

### Health Check

```javascript
import { healthCheck } from './db/database.js';

const health = await healthCheck();
if (health.status === 'ok') {
  console.log('Database is connected');
}
```

### Database Connection Pool

```javascript
import { getPool, closeDatabase } from './db/database.js';

const pool = getPool();
// Pool is ready to use

// When shutting down
await closeDatabase();
```

## Schema Design

The database schema supports:

- **Multi-tenancy**: Workspaces isolate data between teams
- **Hierarchical tasks**: Parent-child task relationships
- **Audit trail**: Activity logs track all changes
- **Soft relationships**: Foreign keys with ON DELETE CASCADE/SET NULL
- **Flexible data**: JSONB fields for extensibility
- **Performance**: Strategic indexes on frequently queried columns

## Migration Guide

To add new tables or modify the schema:

1. Create a new migration file in `migrations/` following the naming convention: `NNN_description.sql`
2. Write your SQL changes
3. Run migrations:

```javascript
import { initializeDatabase, initializeSchema } from './db/database.js';

await initializeDatabase();
await initializeSchema();
```

## Best Practices

1. **Always use repositories** - Don't query the database directly from components
2. **Validate input** - Validate data before passing to repositories
3. **Use transactions** - Wrap multi-step operations in transactions
4. **Log activities** - Use activityRepository to maintain audit trails
5. **Handle errors** - Always catch and log database errors
6. **Paginate large queries** - Use limit and offset for large result sets
7. **Index common queries** - Add indexes for frequently filtered columns
8. **Cache when appropriate** - Cache read-heavy data
9. **Cleanup old data** - Regularly run cleanup operations on activity logs
10. **Test database operations** - Write tests for repository methods

## Troubleshooting

### Connection Issues

```javascript
import { healthCheck } from './db/database.js';

const health = await healthCheck();
console.log(health);
```

### Query Performance

1. Check indexes are created: `SELECT * FROM pg_stat_user_indexes;`
2. Use EXPLAIN to analyze queries: `EXPLAIN SELECT ...`
3. Check connection pool size in database.js

### Migration Issues

1. Review PostgreSQL logs: `SELECT * FROM pg_stat_activity;`
2. Check schema syntax
3. Verify all references exist before running migrations

## Support

For database-related issues:

1. Check DATABASE.md for detailed documentation
2. Review repository method signatures
3. Check application logs for error messages
4. Verify PostgreSQL is running and accessible
5. Confirm environment variables are set correctly
