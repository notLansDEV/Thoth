import BaseRepository from './base.repository.js';
import { getMany, query } from '../database.js';

export class ActivityRepository extends BaseRepository {
  constructor() {
    super('activity_logs');
  }

  /**
   * Log activity
   */
  async log(workspaceId, entityType, action, entityId = null, actorId = null, changes = null, projectId = null) {
    return this.create({
      workspace_id: workspaceId,
      project_id: projectId,
      entity_type: entityType,
      entity_id: entityId,
      action: action,
      actor_id: actorId,
      changes: changes ? JSON.stringify(changes) : null
    });
  }

  /**
   * Get workspace activity (with actor info)
   */
  async getWorkspaceActivity(workspaceId, limit = 50, offset = 0) {
    return getMany(
      `SELECT a.*, u.username AS actor_name, u.full_name AS actor_full_name
       FROM activity_logs a
       LEFT JOIN users u ON a.actor_id = u.id
       WHERE a.workspace_id = $1
       ORDER BY a.created_at DESC
       LIMIT $2 OFFSET $3`,
      [workspaceId, limit, offset]
    );
  }

  /**
   * Get project activity (with actor info)
   */
  async getProjectActivity(projectId, limit = 50, offset = 0) {
    return getMany(
      `SELECT a.*, u.username AS actor_name, u.full_name AS actor_full_name
       FROM activity_logs a
       LEFT JOIN users u ON a.actor_id = u.id
       WHERE a.project_id = $1
       ORDER BY a.created_at DESC
       LIMIT $2 OFFSET $3`,
      [projectId, limit, offset]
    );
  }

  /**
   * Get entity activity
   */
  async getEntityActivity(entityType, entityId) {
    return getMany(
      `SELECT * FROM activity_logs
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC`,
      [entityType, entityId]
    );
  }

  /**
   * Get activity by action
   */
  async getByAction(workspaceId, action, limit = 50) {
    return getMany(
      `SELECT * FROM activity_logs
       WHERE workspace_id = $1 AND action = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [workspaceId, action, limit]
    );
  }

  /**
   * Get activity by actor
   */
  async getByActor(workspaceId, actorId, limit = 50) {
    return getMany(
      `SELECT * FROM activity_logs
       WHERE workspace_id = $1 AND actor_id = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [workspaceId, actorId, limit]
    );
  }

  /**
   * Get recent activity
   */
  async getRecent(workspaceId, hours = 24, limit = 50) {
    return getMany(
      `SELECT * FROM activity_logs
       WHERE workspace_id = $1
         AND created_at >= NOW() - INTERVAL '${hours} hours'
       ORDER BY created_at DESC
       LIMIT $2`,
      [workspaceId, limit]
    );
  }

  /**
   * Cleanup old activity logs
   */
  async cleanup(daysOld = 90) {
    const result = await query(
      'DELETE FROM activity_logs WHERE created_at < NOW() - INTERVAL \'$1 days\'',
      [daysOld]
    );
    return result.rowCount;
  }

  /**
   * Get activity statistics
   */
  async getStats(workspaceId, days = 30) {
    return getMany(
      `SELECT
         DATE(created_at) as date,
         COUNT(*) as count,
         COUNT(DISTINCT actor_id) as unique_actors,
         COUNT(DISTINCT entity_type) as entity_types
       FROM activity_logs
       WHERE workspace_id = $1
         AND created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [workspaceId]
    );
  }
}

export default new ActivityRepository();
