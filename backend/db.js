// SQLite intégré à Node (node:sqlite, Node ≥ 22.13) derrière l'interface de better-sqlite3
// utilisée par index.js. Aucun module natif à compiler : l'hébergement o2switch n'autorise
// pas la compilation et sa glibc (2.28) est trop ancienne pour les binaires de better-sqlite3.
const { DatabaseSync } = require('node:sqlite');

// better-sqlite3 lie `undefined` comme NULL ; node:sqlite le refuse. Le code s'appuie
// sur ce comportement (ex. COALESCE(?, colonne) pour les mises à jour partielles).
const bindable = (params) => params.map((p) => (p === undefined ? null : p));

class Statement {
  constructor(stmt) {
    this.stmt = stmt;
  }
  run(...params) { return this.stmt.run(...bindable(params)); }
  get(...params) { return this.stmt.get(...bindable(params)); }
  all(...params) { return this.stmt.all(...bindable(params)); }
}

class Database {
  constructor(filename) {
    this.db = new DatabaseSync(filename);
    this.depth = 0;
  }

  prepare(sql) { return new Statement(this.db.prepare(sql)); }

  exec(sql) { this.db.exec(sql); return this; }

  pragma(source) { this.db.exec(`PRAGMA ${source}`); }

  close() { this.db.close(); }

  // Comme better-sqlite3 : renvoie une fonction exécutée dans une transaction,
  // annulée si elle lève une exception. Les appels imbriqués utilisent des SAVEPOINT.
  transaction(fn) {
    return (...args) => {
      const savepoint = `sp_${this.depth}`;
      this.db.exec(this.depth === 0 ? 'BEGIN' : `SAVEPOINT ${savepoint}`);
      this.depth++;
      try {
        const result = fn(...args);
        this.depth--;
        this.db.exec(this.depth === 0 ? 'COMMIT' : `RELEASE ${savepoint}`);
        return result;
      } catch (err) {
        this.depth--;
        this.db.exec(this.depth === 0 ? 'ROLLBACK' : `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}`);
        throw err;
      }
    };
  }
}

module.exports = Database;
