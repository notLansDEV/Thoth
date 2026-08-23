import { query, getOne, getMany } from '../database.js';

/**
 * Base Repository class with common CRUD operations
 */
export class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  /**
   * Find by ID
   */
  async findById(id) {
    return getOne(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
  }

  /**
   * Find all
   */
  async findAll(orderBy = 'created_at DESC', limit = 100, offset = 0) {
    const sql = `SELECT * FROM ${this.tableName} ORDER BY ${orderBy} LIMIT $1 OFFSET $2`;
    return getMany(sql, [limit, offset]);
  }

  /**
   * Find by condition
   */
  async findByCondition(whereClause, params = [], orderBy = 'created_at DESC') {
    const sql = `SELECT * FROM ${this.tableName} WHERE ${whereClause} ORDER BY ${orderBy}`;
    return getMany(sql, params);
  }

  /**
   * Count all
   */
  async count() {
    const result = await getOne(`SELECT COUNT(*) as count FROM ${this.tableName}`);
    return result.count;
  }

  /**
   * Count by condition
   */
  async countByCondition(whereClause, params = []) {
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${whereClause}`;
    const result = await getOne(sql, params);
    return result.count;
  }

  /**
   * Delete by ID
   */
  async deleteById(id) {
    const result = await query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
    return result.rowCount > 0;
  }

  /**
   * Update by ID
   */
  async updateById(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    
    const sql = `UPDATE ${this.tableName} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${keys.length + 1} RETURNING *`;
    return getOne(sql, [...values, id]);
  }

  /**
   * Create new record
   */
  async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    
    const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    return getOne(sql, values);
  }

  /**
   * Delete by condition
   */
  async deleteByCondition(whereClause, params = []) {
    const sql = `DELETE FROM ${this.tableName} WHERE ${whereClause}`;
    const result = await query(sql, params);
    return result.rowCount;
  }

  /**
   * Update by condition (returns updated rows)
   */
  async updateByCondition(whereClause, params = [], data = {}) {
    const entries = Object.entries(data);
    if (entries.length === 0) return [];
    const setClause = entries.map(([key], i) => `${key} = $${params.length + i + 1}`).join(', ');
    const sql = `UPDATE ${this.tableName} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE ${whereClause} RETURNING *`;
    return getMany(sql, [...params, ...entries.map(([, value]) => value)]);
  }
}

export default BaseRepository;
