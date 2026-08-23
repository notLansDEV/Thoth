import BaseRepository from './base.repository.js';
import { getMany, getOne } from '../database.js';

export class WorkspaceRepository extends BaseRepository {
  constructor() {
    super('workspaces');
  }

  /**
   * Find by slug
   */
  async findBySlug(slug) {
    return getOne(
      'SELECT * FROM workspaces WHERE slug = $1',
      [slug]
    );
  }

  /**
   * Find all workspaces a user belongs to
   */
  async findByUserId(userId) {
    return getMany(
      `SELECT w.*, wm.role
       FROM workspaces w
       JOIN workspace_members wm ON wm.workspace_id = w.id
       WHERE wm.user_id = $1
       ORDER BY w.created_at`,
      [userId]
    );
  }

  /**
   * Get workspace with projects
   */
  async getWithProjects(workspaceId, includeArchived = false) {
    const workspace = await this.findById(workspaceId);
    if (!workspace) return null;

    let sql = 'SELECT * FROM projects WHERE workspace_id = $1';
    const params = [workspaceId];

    if (!includeArchived) {
      sql += ' AND archived = FALSE';
    }

    sql += ' ORDER BY order_index, name';
    const projects = await getMany(sql, params);

    return { ...workspace, projects };
  }

  /**
   * Get workspace members
   */
  async getMembers(workspaceId) {
    return getMany(
      `SELECT u.*, wm.role, wm.joined_at
       FROM workspace_members wm
       JOIN users u ON wm.user_id = u.id
       WHERE wm.workspace_id = $1
       ORDER BY wm.joined_at DESC`,
      [workspaceId]
    );
  }

  /**
   * Add member to workspace
   */
  async addMember(workspaceId, userId, role = 'member') {
    return getOne(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (workspace_id, user_id)
       DO UPDATE SET role = $3
       RETURNING *`,
      [workspaceId, userId, role]
    );
  }

  /**
   * Remove member from workspace
   */
  async removeMember(workspaceId, userId) {
    const result = await getMany(
      'DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userId]
    );
    return result.rowCount > 0;
  }

  /**
   * Update workspace settings
   */
  async updateSettings(workspaceId, settings) {
    const sql = `
      UPDATE workspaces
      SET settings = settings || $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    return getOne(sql, [JSON.stringify(settings), workspaceId]);
  }

  /**
   * Get workspace statistics
   */
  async getStats(workspaceId) {
    return getOne(
      `SELECT
         COUNT(DISTINCT p.id) as total_projects,
         COUNT(DISTINCT t.id) as total_tasks,
         COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
         COUNT(DISTINCT b.id) as total_bugs,
         COUNT(DISTINCT CASE WHEN b.status = 'resolved' THEN b.id END) as resolved_bugs,
         COUNT(DISTINCT wm.user_id) as total_members
       FROM workspaces w
       LEFT JOIN projects p ON w.id = p.workspace_id
       LEFT JOIN tasks t ON p.id = t.project_id
       LEFT JOIN bugs b ON p.id = b.project_id
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE w.id = $1`,
      [workspaceId]
    );
  }
}

export default new WorkspaceRepository();
