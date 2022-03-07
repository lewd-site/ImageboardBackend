import * as sqlite3 from 'sqlite3';

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
    db.run(`CREATE INDEX IF NOT EXISTS boards_created_at_idx ON boards (created_at)`);
  });
}
