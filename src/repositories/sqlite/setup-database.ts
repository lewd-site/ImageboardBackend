import sqlite3 from 'sqlite3';

export async function setupDatabase(db: sqlite3.Database) {
  return new Promise<void>((resolve) => {
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

      db.run(`CREATE TABLE IF NOT EXISTS files (
        id INTEGER NOT NULL PRIMARY KEY,
        hash TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        extension TEXT NOT NULL,
        type TEXT NOT NULL,
        size INTEGER NOT NULL,
        width INTEGER,
        height INTEGER,
        length REAL,
        ip_id INTEGER NOT NULL REFERENCES ips (id) ON DELETE RESTRICT,
        created_at INTEGER NOT NULL
      )`);

      db.run(`CREATE INDEX IF NOT EXISTS files_hash_idx ON files (hash)`);

      db.run(`CREATE TABLE IF NOT EXISTS posts_files (
        id INTEGER NOT NULL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
        file_id INTEGER NOT NULL REFERENCES files (id) ON DELETE CASCADE
      )`);

      db.run(`CREATE INDEX IF NOT EXISTS posts_files_post_id_idx ON posts_files (post_id)`);

      db.run(`CREATE TABLE IF NOT EXISTS post_references (
        id INTEGER NOT NULL PRIMARY KEY,
        source_id INTEGER NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
        target_id INTEGER NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
        UNIQUE (source_id, target_id)
      )`);

      db.run(`CREATE INDEX IF NOT EXISTS post_references_source_id_idx ON post_references (source_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS post_references_target_id_idx ON post_references (target_id)`);

      db.run(`CREATE TABLE IF NOT EXISTS embeds (
        id INTEGER NOT NULL PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        thumbnail_url TEXT NOT NULL,
        thumbnail_width INTEGER NOT NULL,
        thumbnail_height INETEGER NOT NULL,
        created_at INTEGER NOT NULL
      )`);

      db.run(`CREATE INDEX IF NOT EXISTS embeds_url_idx ON embeds (url)`);

      db.run(`CREATE TABLE IF NOT EXISTS posts_embeds (
        id INTEGER NOT NULL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
        embed_id INTEGER NOT NULL REFERENCES embeds (id) ON DELETE CASCADE,
        UNIQUE (post_id, embed_id)
      )`);

      db.run(`CREATE INDEX IF NOT EXISTS posts_embeds_post_id_idx ON posts_embeds (post_id)`);

      resolve();
    });
  });
}

export default setupDatabase;
