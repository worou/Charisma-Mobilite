// Copie une base SQLite (ancienne version) dans la base MySQL configurée dans .env.
// Usage : node scripts/migrate-sqlite-to-mysql.js chemin/vers/charisma_move.db
// Les identifiants sont conservés ; la base MySQL cible doit être vide.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { DatabaseSync } = require('node:sqlite');
const db = require('../db');
const { initSchema, TABLE_ORDER } = require('../schema');

const source = process.argv[2];
if (!source) {
  console.error('Usage : node scripts/migrate-sqlite-to-mysql.js chemin/vers/base.db');
  process.exit(1);
}

(async () => {
  const sqlite = new DatabaseSync(source, { readOnly: true });
  await initSchema(db);

  const counts = await db.transaction(async (tx) => {
    for (const table of TABLE_ORDER) {
      const { n } = await tx.get(`SELECT COUNT(*) AS n FROM ${table}`);
      if (n > 0) throw new Error(`La table MySQL « ${table} » n'est pas vide : migration annulée`);
    }
    // Les liens orphelins éventuels de l'ancienne base ne doivent pas bloquer l'import
    await tx.run('SET FOREIGN_KEY_CHECKS = 0');
    const result = {};
    for (const table of TABLE_ORDER) {
      const exists = sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
      if (!exists) { result[table] = 0; continue; }
      const mysqlCols = (await tx.all(`SHOW COLUMNS FROM ${table}`)).map((c) => c.Field);
      const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
      for (const row of rows) {
        const cols = Object.keys(row).filter((c) => mysqlCols.includes(c));
        await tx.run(
          `INSERT INTO ${table} (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          ...cols.map((c) => row[c])
        );
      }
      result[table] = rows.length;
    }
    await tx.run('SET FOREIGN_KEY_CHECKS = 1');
    return result;
  });

  console.log('Migration terminée :', counts);
  sqlite.close();
  await db.close();
})().catch(async (err) => {
  console.error('Échec de la migration :', err.message);
  await db.close();
  process.exit(1);
});
