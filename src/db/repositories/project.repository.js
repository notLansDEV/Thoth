import BaseRepository from './base.repository.js';
import { getMany, query } from '../database.js';

export class ProjectRepository extends BaseRepository {
  constructor() {
    super('projects');
  }

  /**
   * Find projects by workspace
   */
  async findByWorkspace(workspaceId, includeArchived = false) {
    let sql = 'SELECT * FROM projects WHERE workspace_id = $1';
    const params = [workspaceId];

    if (!includeArchived) {
      sql += ' AND archived = FALSE';
    }

    sql += ' ORDER BY order_index, name';
    return getMany(sql, params);
  }

  /**
   * Find by slug in workspace
   */
  async findBySlug(workspaceId, slug) {
    return getMany(
      'SELECT * FROM projects WHERE workspace_id = $1 AND slug = $2',
      [workspaceId, slug]
    ).then(rows => rows[0] || null);
  }

  /**
   * Get project statistics
   */
  async getStats(projectId) {
    const sql = `
      SELECT
        COUNT(DISTINCT t.id) as total_tasks,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
        COUNT(DISTINCT b.id) as total_bugs,
        COUNT(DISTINCT CASE WHEN b.status = 'resolved' THEN b.id END) as resolved_bugs
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id
      LEFT JOIN bugs b ON p.id = b.project_id
      WHERE p.id = $1
    `;
    return getMany(sql, [projectId]).then(rows => rows[0] || {});
  }

  /**
   * Update project settings
   */
  async updateSettings(projectId, settings) {
    const sql = `
      UPDATE projects 
      SET settings = settings || $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    return getMany(sql, [JSON.stringify(settings), projectId]).then(rows => rows[0] || null);
  }

  /**
   * Get workspace members allowed to work in a project
   */
  async getMembers(projectId) {
    return getMany(
      `SELECT u.id, u.username, u.email, u.full_name, u.avatar_url
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1
       ORDER BY u.full_name`,
      [projectId]
    );
  }

  /**
   * Replace the set of members allowed to work in a project
   */
  async setMembers(projectId, userIds) {
    if (userIds && userIds.length > 0) {
      const values = userIds
        .map((_, i) => `($1, $${i + 2})`)
        .join(', ');
      await query(
        `DELETE FROM project_members WHERE project_id = $1`
      );
      await query(
        `INSERT INTO project_members (project_id, user_id) VALUES ${values}`,
        [projectId, ...userIds]
      );
    } else {
      await query(
        `DELETE FROM project_members WHERE project_id = $1`,
        [projectId]
      );
    }
    return this.getMembers(projectId);
  }
}

export default new ProjectRepository();
