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
}

export default new UserRepository();
