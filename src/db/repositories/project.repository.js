import BaseRepository from './base.repository.js';
import { getMany, query } from '../database.js';

export class ProjectRepository extends BaseRepository {
  constructor() {
    super('projects');
  }

  /**
   * Find projects by workspace
   */
  async findByWorkspace(workspaceId, includeArchived = false, includeDeleted = false) {
    let sql = 'SELECT * FROM projects WHERE workspace_id = $1';
    const params = [workspaceId];

    if (!includeArchived) {
      sql += ' AND archived = FALSE';
    }
    if (!includeDeleted) {
      sql += ' AND deleted_at IS NULL';
    }

    sql += ' ORDER BY order_index, name';
    return getMany(sql, params);
  }

  async findDeletedByWorkspace(workspaceId) {
    return getMany(
      `SELECT * FROM projects WHERE workspace_id = $1 AND deleted_at IS NOT NULL ORDER BY deleted_at DESC, name`,
      [workspaceId]
    );
  }

  async softDeleteById(id) {
    const rows = await getMany(
      `UPDATE projects SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id]
    );
    return rows[0] || null;
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
        COUNT(DISTINCT CASE WHEN LOWER(t.status) IN ('done', 'completed') THEN t.id END) as completed_tasks,
        COUNT(DISTINCT b.id) as total_bugs,
        COUNT(DISTINCT CASE WHEN b.status = 'resolved' THEN b.id END) as resolved_bugs
      FROM projects p
      LEFT JOIN tasks t ON p.id = t.project_id AND t.deleted_at IS NULL
      LEFT JOIN bugs b ON p.id = b.project_id AND b.deleted_at IS NULL
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
      `SELECT u.id, u.username, u.email, u.full_name, u.avatar_url, pm.role AS project_role
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1
       ORDER BY u.full_name`,
      [projectId]
    );
  }

  /**
   * Replace the set of members allowed to work in a project
   * entries: array of userId strings OR { user_id, role }
   */
  async setMembers(projectId, entries) {
    await query(`DELETE FROM project_members WHERE project_id = $1`, [projectId]);

    const normalized = (Array.isArray(entries) ? entries : [])
      .map((e) => {
        if (!e) return null
        if (typeof e === 'string') return { user_id: e, role: 'member' }
        const userId = e.user_id || e.id
        if (!userId) return null
        return { user_id: userId, role: e.role || e.project_role || 'member' }
      })
      .filter(Boolean)

    if (normalized.length > 0) {
      const values = normalized
        .map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`)
        .join(', ');
      const params = [projectId]
      for (const e of normalized) {
        params.push(e.user_id, e.role)
      }
      await query(
        `INSERT INTO project_members (project_id, user_id, role) VALUES ${values}`,
        params
      );
    }

    return this.getMembers(projectId);
  }

  async getMemberProjectsForWorkspace(workspaceId) {
    return getMany(
      `SELECT pm.project_id, pm.user_id, pm.role AS project_role
       FROM project_members pm
       JOIN projects p ON p.id = pm.project_id
       WHERE p.workspace_id = $1`,
      [workspaceId]
    );
  }

  async setUserProjectMemberships(workspaceId, userId, assignments) {
    // assignments: [{ project_id, role }]
    const rows = await getMany(`SELECT id FROM projects WHERE workspace_id = $1`, [workspaceId])
    const valid = new Set(rows.map(r => String(r.id)))
    const normalized = (Array.isArray(assignments) ? assignments : [])
      .map((a) => ({ project_id: a?.project_id || a?.id, role: a?.role || a?.project_role || 'member' }))
      .filter((a) => a.project_id && valid.has(String(a.project_id)))

    // Replace all of this user's project memberships within the workspace
    await query(
      `DELETE FROM project_members pm
       USING projects p
       WHERE pm.project_id = p.id
         AND p.workspace_id = $1
         AND pm.user_id = $2`,
      [workspaceId, userId]
    )

    if (normalized.length > 0) {
      const values = normalized.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(', ')
      const params = []
      for (const a of normalized) params.push(a.project_id, userId, a.role)
      await query(`INSERT INTO project_members (project_id, user_id, role) VALUES ${values}`, params)
    }

    return getMany(
      `SELECT pm.project_id, pm.user_id, pm.role AS project_role
       FROM project_members pm
       JOIN projects p ON p.id = pm.project_id
       WHERE p.workspace_id = $1 AND pm.user_id = $2`,
      [workspaceId, userId]
    );
  }
}

export default new ProjectRepository();
