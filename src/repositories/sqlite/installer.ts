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

    db.run(`CREATE TABLE IF NOT EXISTS posts (
      id INTEGER NOT NULL PRIMARY KEY,
      board_id INTEGER NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
      parent_id INTEGER REFERENCES posts (id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      message TEXT NOT NULL,
      ip TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      bumped_at INTEGER,
      post_count INTEGER
    )`);

    db.run(`CREATE INDEX IF NOT EXISTS posts_board_id_idx ON posts (board_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS posts_parent_id_idx ON posts (parent_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS posts_bumped_at_idx ON posts (bumped_at)`);
  });
}
