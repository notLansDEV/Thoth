import BaseRepository from './base.repository.js';
import { getMany } from '../database.js';

export class MilestoneRepository extends BaseRepository {
  constructor() {
    super('milestones');
  }

  /**
   * Find milestones by project
   */
  async findByProject(projectId, includeCompleted = false) {
    let sql = 'SELECT * FROM milestones WHERE project_id = $1';
    const params = [projectId];

    if (!includeCompleted) {
      sql += ' AND status != \'completed\'';
    }

    sql += ' ORDER BY due_date ASC, name';
    return getMany(sql, params);
  }

  /**
   * Get milestone with tasks
   */
  async getWithTasks(milestoneId) {
    const milestone = await this.findById(milestoneId);
    if (!milestone) return null;

    const tasks = await getMany(
      'SELECT * FROM tasks WHERE milestone_id = $1 ORDER BY order_index',
      [milestoneId]
    );

    return { ...milestone, tasks };
  }

  /**
   * Get milestone progress
   */
  async getProgress(milestoneId) {
    const result = await getMany(
      `SELECT
         COUNT(*) as total,
         COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
       FROM tasks
       WHERE milestone_id = $1`,
      [milestoneId]
    ).then(rows => rows[0] || {});

    const progress = result.total > 0 ? Math.round((result.completed / result.total) * 100) : 0;
    return { ...result, progress };
  }

  /**
   * Update milestone progress
   */
  async updateProgress(milestoneId) {
    const progress = await this.getProgress(milestoneId);
    return this.updateById(milestoneId, { progress: progress.progress });
  }

  /**
   * Get upcoming milestones
   */
  async getUpcoming(projectId, days = 30) {
    return getMany(
      `SELECT * FROM milestones
       WHERE project_id = $1
         AND due_date <= NOW() + INTERVAL '${days} days'
         AND status != 'completed'
       ORDER BY due_date ASC`,
      [projectId]
    );
  }
}

export default new MilestoneRepository();
