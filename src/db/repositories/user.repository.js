import { query, getOne } from '../database.js';

class UserRepository {
  constructor() {
    this.table = 'users';
  }

  async create({ username, email, password_hash, full_name }) {
    const text = `INSERT INTO users (username, email, password_hash, full_name) VALUES ($1,$2,$3,$4) RETURNING *`;
    const res = await query(text, [username, email, password_hash, full_name]);
    return res.rows[0];
  }

  async findByEmail(email) {
    const text = `SELECT * FROM users WHERE email = $1 LIMIT 1`;
    return await getOne(text, [email]);
  }

  async findByUsername(username) {
    const text = `SELECT * FROM users WHERE username = $1 LIMIT 1`;
    return await getOne(text, [username]);
  }

  async findById(id) {
    const text = `SELECT * FROM users WHERE id = $1 LIMIT 1`;
    return await getOne(text, [id]);
  }

  async updatePassword(id, password_hash) {
    const text = `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`;
    const res = await query(text, [password_hash, id]);
    return res.rows[0];
  }

  async deleteById(id) {
    const text = `DELETE FROM users WHERE id = $1 RETURNING id`;
    const res = await query(text, [id]);
    return res.rows[0];
  }
}

export default new UserRepository();
