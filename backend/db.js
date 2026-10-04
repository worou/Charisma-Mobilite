// Accès MySQL / MariaDB (pool mysql2) avec une interface proche de l'ancienne version SQLite :
//   await db.get(sql, ...params)  -> première ligne ou undefined
//   await db.all(sql, ...params)  -> tableau de lignes
//   await db.run(sql, ...params)  -> { changes, lastInsertRowid }
//   await db.transaction(async (tx) => { ... tx.get / tx.all / tx.run ... })
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  connectionLimit: parseInt(process.env.DB_POOL_SIZE) || 5,
  // Mêmes formats que l'API renvoyait avec SQLite : dates en texte, sommes en nombres
  dateStrings: true,
  decimalNumbers: true,
  timezone: 'Z',
});

// Horodatages (created_at) stockés et relus en UTC, comme datetime('now') sous SQLite
pool.on('connection', (conn) => conn.query("SET time_zone = '+00:00'"));

// mysql2 refuse `undefined` ; le code s'appuie sur undefined -> NULL (ex. COALESCE(?, colonne))
const bindable = (params) => params.map((p) => (p === undefined ? null : p));

const queries = (conn) => ({
  async all(sql, ...params) {
    const [rows] = await conn.query(sql, bindable(params));
    return rows;
  },
  async get(sql, ...params) {
    const [rows] = await conn.query(sql, bindable(params));
    return rows[0];
  },
  async run(sql, ...params) {
    const [result] = await conn.query(sql, bindable(params));
    return { changes: result.affectedRows, lastInsertRowid: result.insertId };
  },
});

const db = {
  ...queries(pool),
  pool,

  // Exécute fn dans une transaction sur une connexion dédiée ; annulée si fn lève une exception
  async transaction(fn) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const result = await fn(queries(conn));
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  close: () => pool.end(),
};

module.exports = db;
