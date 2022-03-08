import sqlite3 from 'sqlite3';

export function setupDatabase(db: sqlite3.Database) {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS boards (
      id INTEGER NOT NULL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      post_count INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )`);

    db.run(`CREATE INDEX IF NOT EXISTS boards_post_count_idx ON boards (post_count)`);

    db.run(`CREATE TABLE IF NOT EXISTS names (
      id INTEGER NOT NULL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tripcodes (
      id INTEGER NOT NULL PRIMARY KEY,
      tripcode TEXT NOT NULL UNIQUE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS ips (
      id INTEGER NOT NULL PRIMARY KEY,
      ip TEXT NOT NULL UNIQUE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS posts (
      id INTEGER NOT NULL PRIMARY KEY,
      board_id INTEGER NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
      parent_id INTEGER REFERENCES posts (id) ON DELETE CASCADE,
      subject TEXT,
      name_id INTEGER REFERENCES names (id) ON DELETE RESTRICT,
      tripcode_id INTEGER REFERENCES tripcodes (id) ON DELETE RESTRICT,
      message TEXT NOT NULL,
      message_parsed TEXT NOT NULL,
      ip_id INTEGER NOT NULL REFERENCES ips (id) ON DELETE RESTRICT,
      created_at INTEGER NOT NULL,
      bumped_at INTEGER,
      post_count INTEGER
    )`);

    db.run(`CREATE INDEX IF NOT EXISTS posts_board_id_idx ON posts (board_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS posts_parent_id_idx ON posts (parent_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS posts_bumped_at_idx ON posts (bumped_at)`);
  });
}
