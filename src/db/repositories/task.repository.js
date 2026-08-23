import BaseRepository from './base.repository.js';
import { getMany, query } from '../database.js';

export class TaskRepository extends BaseRepository {
  constructor() {
    super('tasks');
  }

  /**
   * Find tasks by project
   */
  async findByProject(projectId, filters = {}) {
    let sql = 'SELECT * FROM tasks WHERE project_id = $1';
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

    if (filters.milestone) {
      sql += ` AND milestone_id = $${paramIndex}`;
      params.push(filters.milestone);
      paramIndex++;
    }

    sql += ' ORDER BY order_index, created_at DESC';
    return getMany(sql, params);
  }

  /**
   * Find subtasks
   */
  async findSubtasks(parentTaskId) {
    return getMany(
      'SELECT * FROM tasks WHERE parent_task_id = $1 ORDER BY order_index',
      [parentTaskId]
    );
  }

  /**
   * Get task with subtasks
   */
  async getWithSubtasks(taskId) {
    const task = await this.findById(taskId);
    if (!task) return null;

    const subtasks = await this.findSubtasks(taskId);
    return { ...task, subtasks };
  }

  /**
   * Complete task
   */
  async complete(taskId) {
    return this.updateById(taskId, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });
  }

  /**
   * Get tasks due soon
   */
  async getDueSoon(projectId, days = 7) {
    const sql = `
      SELECT * FROM tasks
      WHERE project_id = $1
        AND due_date IS NOT NULL
        AND due_date <= NOW() + INTERVAL '${days} days'
        AND status != 'completed'
      ORDER BY due_date ASC
    `;
    return getMany(sql, [projectId]);
  }

  /**
   * Get overdue tasks
   */
  async getOverdue(projectId) {
    return getMany(
      `SELECT * FROM tasks
       WHERE project_id = $1
         AND due_date < NOW()
         AND status != 'completed'
       ORDER BY due_date ASC`,
      [projectId]
    );
  }

  /**
   * Bulk update task status
   */
  async bulkUpdateStatus(taskIds, status) {
    const placeholders = taskIds.map((_, i) => `$${i + 1}`).join(',');
    const sql = `
      UPDATE tasks
      SET status = $${taskIds.length + 1}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY(ARRAY[${placeholders}])
      RETURNING *
    `;
    const result = await query(sql, [...taskIds, status]);
    return result.rows;
  }
}

export default new TaskRepository();
