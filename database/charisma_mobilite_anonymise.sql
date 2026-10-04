-- Export ANONYMISÉ Charisma'Mobilité : noms, emails et téléphones remplacés, mots de passe retirés
-- Les comptes importés ne peuvent pas se connecter : recréer un admin via ADMIN_EMAIL / ADMIN_PASSWORD
-- 2026-10-04T17:50:10.474Z
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

CREATE TABLE announcements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    departure   TEXT NOT NULL,
    destination TEXT NOT NULL,
    datetime    TEXT NOT NULL,
    seats       INTEGER NOT NULL,
    price       REAL,
    description TEXT,
    created_at  TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
INSERT INTO "announcements" ("id", "user_id", "departure", "destination", "datetime", "seats", "price", "description", "created_at") VALUES (1, 2, 'avon', 'blanc mesnil', '2026-08-23T11:04', 2, NULL, NULL, '2026-08-16 09:04:10');
INSERT INTO "announcements" ("id", "user_id", "departure", "destination", "datetime", "seats", "price", "description", "created_at") VALUES (2, 4, 'Cotonou', 'Porto-Novo', '2026-09-12T09:30', 2, NULL, NULL, '2026-08-16 09:13:01');
INSERT INTO "announcements" ("id", "user_id", "departure", "destination", "datetime", "seats", "price", "description", "created_at") VALUES (3, 2, 'bourget', 'blanc mesnil', '2026-08-23T11:32', 4, NULL, NULL, '2026-08-16 09:32:46');
INSERT INTO "announcements" ("id", "user_id", "departure", "destination", "datetime", "seats", "price", "description", "created_at") VALUES (4, 2, 'Paris', 'Le Blanc Mesnil', '2026-10-11T18:26', 0, NULL, NULL, '2026-10-04 15:25:52');

CREATE TABLE bookings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    departure   TEXT,
    arrival     TEXT,
    travel_date TEXT,
    travel_time TEXT,
    seats       INTEGER,
    price       REAL DEFAULT 0,
    status      TEXT DEFAULT 'pending',
    created_at  TEXT DEFAULT (datetime('now')), announcement_id INTEGER REFERENCES announcements(id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
INSERT INTO "bookings" ("id", "user_id", "departure", "arrival", "travel_date", "travel_time", "seats", "price", "status", "created_at", "announcement_id") VALUES (1, 2, 'Paris', 'Lyon', '2024-01-15', '14:00', 1, 0, 'pending', '2026-08-16 09:33:22', NULL);
INSERT INTO "bookings" ("id", "user_id", "departure", "arrival", "travel_date", "travel_time", "seats", "price", "status", "created_at", "announcement_id") VALUES (4, 7, 'Cotonou', 'Porto-Novo', '2026-09-12', '09:30', 1, 0, 'pending', '2026-08-16 09:41:27', 2);
INSERT INTO "bookings" ("id", "user_id", "departure", "arrival", "travel_date", "travel_time", "seats", "price", "status", "created_at", "announcement_id") VALUES (7, 2, 'Paris', 'Le Blanc Mesnil', '2026-10-11', '18:26', 1, 0, 'pending', '2026-10-04 15:27:56', 4);

CREATE TABLE bus_bookings (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    line_id      INTEGER NOT NULL,
    user_id      INTEGER NOT NULL,
    service_date TEXT NOT NULL,
    seats        INTEGER NOT NULL CHECK (seats > 0),
    created_at   TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (line_id) REFERENCES bus_lines(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
INSERT INTO "bus_bookings" ("id", "line_id", "user_id", "service_date", "seats", "created_at") VALUES (3, 4, 2, '2026-10-04', 5, '2026-10-04 16:35:34');

CREATE TABLE bus_lines (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL UNIQUE,
    seats      INTEGER NOT NULL CHECK (seats > 0),
    active     INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
INSERT INTO "bus_lines" ("id", "name", "seats", "active", "created_at") VALUES (2, 'Ligne Bobigny', 50, 1, '2026-10-04 16:33:18');
INSERT INTO "bus_lines" ("id", "name", "seats", "active", "created_at") VALUES (3, 'Ligne Trappes', 50, 1, '2026-10-04 16:33:35');
INSERT INTO "bus_lines" ("id", "name", "seats", "active", "created_at") VALUES (4, 'Ligne Melun', 20, 1, '2026-10-04 16:33:55');

CREATE TABLE items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

CREATE TABLE notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    title      TEXT NOT NULL,
    message    TEXT NOT NULL,
    is_read    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

CREATE TABLE users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    first_name TEXT,
    gender     TEXT,
    email      TEXT NOT NULL UNIQUE,
    password   TEXT NOT NULL,
    phone      TEXT,
    is_admin   INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
INSERT INTO "users" ("id", "name", "first_name", "gender", "email", "password", "phone", "is_admin", "created_at") VALUES (1, 'Admin 1', NULL, NULL, 'admin1@example.com', '', NULL, 1, '2026-05-08 12:53:03');
INSERT INTO "users" ("id", "name", "first_name", "gender", "email", "password", "phone", "is_admin", "created_at") VALUES (2, 'Admin 2', NULL, 'M', 'admin2@example.com', '', NULL, 1, '2026-08-16 08:45:50');
INSERT INTO "users" ("id", "name", "first_name", "gender", "email", "password", "phone", "is_admin", "created_at") VALUES (4, 'Utilisateur 4', NULL, NULL, 'utilisateur4@example.com', '', NULL, 0, '2026-08-16 09:13:01');
INSERT INTO "users" ("id", "name", "first_name", "gender", "email", "password", "phone", "is_admin", "created_at") VALUES (5, 'Utilisateur 5', NULL, NULL, 'utilisateur5@example.com', '', NULL, 0, '2026-08-16 09:39:12');
INSERT INTO "users" ("id", "name", "first_name", "gender", "email", "password", "phone", "is_admin", "created_at") VALUES (6, 'Utilisateur 6', NULL, 'F', 'utilisateur6@example.com', '', NULL, 0, '2026-08-16 09:40:17');
INSERT INTO "users" ("id", "name", "first_name", "gender", "email", "password", "phone", "is_admin", "created_at") VALUES (7, 'Utilisateur 7', NULL, 'F', 'utilisateur7@example.com', '', NULL, 0, '2026-08-16 09:41:11');
INSERT INTO "users" ("id", "name", "first_name", "gender", "email", "password", "phone", "is_admin", "created_at") VALUES (8, 'Utilisateur 8', NULL, NULL, 'utilisateur8@example.com', '', NULL, 0, '2026-08-16 09:43:12');
INSERT INTO "users" ("id", "name", "first_name", "gender", "email", "password", "phone", "is_admin", "created_at") VALUES (9, 'Utilisateur 9', NULL, NULL, 'utilisateur9@example.com', '', NULL, 0, '2026-08-16 09:43:12');

CREATE INDEX idx_bus_bookings_line_date ON bus_bookings(line_id, service_date);

COMMIT;
PRAGMA foreign_keys=ON;
