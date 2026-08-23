import BaseRepository from './base.repository.js';
import { getMany } from '../database.js';

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
}

export default new ProjectRepository();
