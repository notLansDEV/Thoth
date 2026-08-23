import BaseRepository from './base.repository.js';
import { getMany, getOne } from '../database.js';

export class BugRepository extends BaseRepository {
  constructor() {
    super('bugs');
  }

  /**
   * Find bugs by project
   */
  async findByProject(projectId, filters = {}) {
    let sql = 'SELECT * FROM bugs WHERE project_id = $1';
    const params = [projectId];
    let paramIndex = 2;

    if (filters.status) {
      sql += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.priority) {
      sql += ` AND priority = $${paramIndex}`;
      params.push(filters.priority);
      paramIndex++;
    }

    if (filters.assignedTo) {
      sql += ` AND assigned_to = $${paramIndex}`;
      params.push(filters.assignedTo);
      paramIndex++;
    }

    if (filters.kanbanColumn) {
      sql += ` AND kanban_column = $${paramIndex}`;
      params.push(filters.kanbanColumn);
    }

    sql += ' ORDER BY created_at DESC';
    return getMany(sql, params);
  }

  /**
   * Find by kanban column
   */
  async findByKanbanColumn(projectId, columnName) {
    return getMany(
      'SELECT * FROM bugs WHERE project_id = $1 AND kanban_column = $2 ORDER BY created_at DESC',
      [projectId, columnName]
    );
  }

  /**
   * Generate bug ID based on kanban column
   */
  async generateBugId(projectId, kanbanColumn) {
    const result = await getOne(
      `SELECT COUNT(*) as count FROM bugs WHERE project_id = $1 AND kanban_column = $2`,
      [projectId, kanbanColumn]
    );
    const count = Number(result?.count || 0) + 1;
    return `${kanbanColumn}-${String(count).padStart(2, '0')}`;
  }

  /**
   * Get bug with comments
   */
  async getWithComments(bugId) {
    const bug = await this.findById(bugId);
    if (!bug) return null;

    const comments = await getMany(
      'SELECT * FROM bug_comments WHERE bug_id = $1 ORDER BY created_at DESC',
      [bugId]
    );

    return { ...bug, comments };
  }

  /**
   * Add comment to bug
   */
  async addComment(bugId, authorId, content, attachments = []) {
    return getOne(
      `INSERT INTO bug_comments (bug_id, author_id, content, attachments)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [bugId, authorId, content, JSON.stringify(attachments)]
    );
  }

  /**
   * Get comments for bug
   */
  async getComments(bugId) {
    return getMany(
      'SELECT * FROM bug_comments WHERE bug_id = $1 ORDER BY created_at DESC',
      [bugId]
    );
  }

  /**
   * Update kanban column
   */
  async updateKanbanColumn(bugId, kanbanColumn) {
    return this.updateById(bugId, { kanban_column: kanbanColumn });
  }

  /**
   * Get bug statistics
   */
  async getStats(projectId) {
    const sql = `
      SELECT
        status,
        priority,
        COUNT(*) as count
      FROM bugs
      WHERE project_id = $1
      GROUP BY status, priority
    `;
    return getMany(sql, [projectId]);
  }

  /**
   * Get high priority bugs
   */
  async getHighPriority(projectId) {
    return getMany(
      `SELECT * FROM bugs
       WHERE project_id = $1
         AND priority IN ('high', 'critical')
         AND status != 'resolved'
       ORDER BY priority DESC, created_at DESC`,
      [projectId]
    );
  }
}

export default new BugRepository();
