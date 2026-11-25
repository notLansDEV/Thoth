import BaseRepository from './base.repository.js';
import { getMany, getOne } from '../database.js';

export class NotificationRepository extends BaseRepository {
  constructor() {
    super('notifications');
  }

  async createForUser({ userId, workspaceId, entityType, entityId, title, body }) {
    return this.create({
      user_id: userId,
      workspace_id: workspaceId || null,
      entity_type: entityType || null,
      entity_id: entityId || null,
      title,
      body: body || null,
      is_read: false,
    });
  }

  async getForUser(userId, limit = 50) {
    return getMany(
      `SELECT n.*, u.username AS actor_name, u.full_name AS actor_full_name
       FROM notifications n
       LEFT JOIN users u ON n.user_id = u.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
  }

  async getUnreadCount(userId) {
    const row = await getOne(
      'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );
    return row ? row.count : 0;
  }

  async markRead(id, userId) {
    return getOne(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
  }

  async markAllRead(userId) {
    await getMany(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );
  }
}

export default new NotificationRepository();
