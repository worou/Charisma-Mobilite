// Schéma MySQL / MariaDB, créé au démarrage s'il n'existe pas encore.
// Les dates de trajet restent en texte (« AAAA-MM-JJTHH:MM », heure locale) comme le front les envoie ;
// les created_at sont des TIMESTAMP en UTC.
const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    gender     VARCHAR(20),
    email      VARCHAR(255) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    phone      VARCHAR(50),
    is_admin   TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS items (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS announcements (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    departure   VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    datetime    VARCHAR(16) NOT NULL,
    seats       INT NOT NULL,
    price       DECIMAL(8,2),
    description TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_announcements_datetime (datetime),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Supprimer un trajet ne doit pas échouer à cause des réservations : elles gardent
  // leurs colonnes à plat (départ, arrivée, date) et perdent seulement le lien.
  `CREATE TABLE IF NOT EXISTS bookings (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    announcement_id INT NULL,
    departure       VARCHAR(255),
    arrival         VARCHAR(255),
    travel_date     VARCHAR(10),
    travel_time     VARCHAR(5),
    seats           INT,
    price           DECIMAL(8,2) DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'pending',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Bus de l'Église : l'admin crée les lignes, les places sont comptées par date de culte
  `CREATE TABLE IF NOT EXISTS bus_lines (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(255) NOT NULL UNIQUE,
    seats      INT NOT NULL CHECK (seats > 0),
    stops      TEXT,
    active     TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS bus_bookings (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    line_id      INT NOT NULL,
    user_id      INT NOT NULL,
    service_date CHAR(10) NOT NULL,
    seats        INT NOT NULL CHECK (seats > 0),
    ticket_code  VARCHAR(32) UNIQUE,
    validated_at TIMESTAMP NULL,
    validated_by INT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_bus_bookings_line_date (line_id, service_date),
    FOREIGN KEY (line_id) REFERENCES bus_lines(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Chauffeurs attribués à chaque ligne : ils valident les billets (QR code) à la montée
  `CREATE TABLE IF NOT EXISTS bus_line_drivers (
    line_id    INT NOT NULL,
    user_id    INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (line_id, user_id),
    INDEX idx_bus_line_drivers_user (user_id),
    FOREIGN KEY (line_id) REFERENCES bus_lines(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS notifications (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    title      VARCHAR(255) NOT NULL,
    message    TEXT NOT NULL,
    is_read    TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

// Ordre de création = ordre des clés étrangères ; aussi utilisé par le script de migration
// (bus_line_drivers n'existait pas sous SQLite : il n'y a rien à migrer)
const TABLE_ORDER = ['users', 'items', 'announcements', 'bookings', 'bus_lines', 'bus_bookings', 'notifications'];

// Colonnes ajoutées après coup : créées sur les bases existantes si elles manquent
const COLUMNS = [
  // Arrêts de la ligne, du départ à la destination : tableau JSON de noms
  ['bus_lines', 'stops', 'TEXT AFTER seats'],
  // Billet de bus : code contenu dans le QR code, validé par le chauffeur à la montée
  ['bus_bookings', 'ticket_code', 'VARCHAR(32) UNIQUE AFTER seats'],
  ['bus_bookings', 'validated_at', 'TIMESTAMP NULL AFTER ticket_code'],
  ['bus_bookings', 'validated_by', 'INT NULL AFTER validated_at'],
];

async function initSchema(db) {
  for (const sql of TABLES) await db.run(sql);
  for (const [table, column, definition] of COLUMNS) {
    const exists = await db.get(
      'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      table, column);
    if (!exists) await db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

module.exports = { initSchema, TABLE_ORDER };
