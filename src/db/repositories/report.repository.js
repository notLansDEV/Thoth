import BaseRepository from './base.repository.js';
import { getMany, getOne } from '../database.js';

export class ReportRepository extends BaseRepository {
  constructor() {
    super('reports');
  }

  /**
   * Find reports by project
   */
  async findByProject(projectId, limit = 30, offset = 0) {
    return getMany(
      `SELECT * FROM reports
       WHERE project_id = $1
       ORDER BY report_date DESC
       LIMIT $2 OFFSET $3`,
      [projectId, limit, offset]
    );
  }

  /**
   * Get report by date
   */
  async getByDate(projectId, reportDate) {
    const dateStr = reportDate instanceof Date ? reportDate.toISOString().split('T')[0] : reportDate;
    return getOne(
      'SELECT * FROM reports WHERE project_id = $1 AND report_date = $2',
      [projectId, dateStr]
    );
  }

  /**
   * Get latest report
   */
  async getLatest(projectId) {
    return getOne(
      `SELECT * FROM reports
       WHERE project_id = $1
       ORDER BY report_date DESC
       LIMIT 1`,
      [projectId]
    );
  }

  /**
   * Get report date range
   */
  async getDateRange(projectId, startDate, endDate) {
    return getMany(
      `SELECT * FROM reports
       WHERE project_id = $1
         AND report_date >= $2
         AND report_date <= $3
       ORDER BY report_date DESC`,
      [projectId, startDate, endDate]
    );
  }

  /**
   * Generate daily report
   */
  async generateDailyReport(projectId, reportDate = new Date()) {
    const dateStr = reportDate.toISOString().split('T')[0];
    
    // Get stats for the day
    const stats = await getOne(
      `SELECT
         COUNT(DISTINCT CASE WHEN t.created_at::date = $2 AND t.status = 'completed' THEN t.id END) as tasks_done,
         COUNT(DISTINCT CASE WHEN t.status = 'todo' THEN t.id END) as tasks_backlog,
         COUNT(DISTINCT CASE WHEN b.created_at::date = $2 AND b.status = 'resolved' THEN b.id END) as bugs_fixed,
         COUNT(DISTINCT CASE WHEN b.created_at::date = $2 THEN b.id END) as bugs_added
       FROM projects p
       LEFT JOIN tasks t ON p.id = t.project_id
       LEFT JOIN bugs b ON p.id = b.project_id
       WHERE p.id = $1`,
      [projectId, dateStr]
    );

    // Create or update report
    const existing = await this.getByDate(projectId, dateStr);
    
    if (existing) {
      return this.updateById(existing.id, {
        tasks_done: stats.tasks_done || 0,
        tasks_backlog: stats.tasks_backlog || 0,
        bugs_fixed: stats.bugs_fixed || 0,
        bugs_added: stats.bugs_added || 0
      });
    } else {
      return this.create({
        project_id: projectId,
        title: `Daily Report - ${dateStr}`,
        report_date: dateStr,
        tasks_done: stats.tasks_done || 0,
        tasks_backlog: stats.tasks_backlog || 0,
        bugs_fixed: stats.bugs_fixed || 0,
        bugs_added: stats.bugs_added || 0
      });
    }
  }

  /**
   * Get report summary
   */
  async getSummary(projectId, days = 30) {
    return getOne(
      `SELECT
         COUNT(*) as total_reports,
         SUM(tasks_done) as total_tasks_done,
         SUM(tasks_backlog) as total_tasks_backlog,
         SUM(bugs_fixed) as total_bugs_fixed,
         SUM(bugs_added) as total_bugs_added,
         AVG(tasks_done) as avg_tasks_done,
         AVG(bugs_fixed) as avg_bugs_fixed
       FROM reports
       WHERE project_id = $1
         AND report_date >= NOW() - INTERVAL '${days} days'`,
      [projectId]
    );
  }
}

export default new ReportRepository();
