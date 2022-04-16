import { ClientBase } from 'pg';

export async function setupDatabase(client: ClientBase) {
  await client.query(`CREATE TABLE IF NOT EXISTS boards (
    id smallserial PRIMARY KEY,
    slug varchar(20) NOT NULL UNIQUE,
    title varchar(100) NOT NULL,
    post_count integer NOT NULL,
    created_at timestamp with time zone NOT NULL
  )`);

  await client.query(`CREATE INDEX IF NOT EXISTS boards_post_count_idx ON boards (post_count)`);

  await client.query(`CREATE TABLE IF NOT EXISTS names (
    id serial PRIMARY KEY,
    name varchar(40) NOT NULL UNIQUE
  )`);

  await client.query(`CREATE TABLE IF NOT EXISTS tripcodes (
    id serial PRIMARY KEY,
    tripcode varchar(10) NOT NULL UNIQUE
  )`);

  await client.query(`CREATE TABLE IF NOT EXISTS ips (
    id serial PRIMARY KEY,
    ip varchar(45) NOT NULL UNIQUE
  )`);

  await client.query(`CREATE TABLE IF NOT EXISTS posts (
    id serial PRIMARY KEY,
    board_id smallint NOT NULL REFERENCES boards (id) ON DELETE CASCADE,
    parent_id integer REFERENCES posts (id) ON DELETE CASCADE,
    subject varchar(40),
    name_id integer REFERENCES names (id) ON DELETE RESTRICT,
    tripcode_id integer REFERENCES tripcodes (id) ON DELETE RESTRICT,
    message text NOT NULL,
    message_parsed text NOT NULL,
    ip_id integer NOT NULL REFERENCES ips (id) ON DELETE RESTRICT,
    created_at timestamp with time zone NOT NULL,
    bumped_at timestamp with time zone,
    post_count integer
  )`);

  await client.query(`CREATE INDEX IF NOT EXISTS posts_board_id_idx ON posts (board_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS posts_parent_id_idx ON posts (parent_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS posts_bumped_at_idx ON posts (bumped_at)`);

  await client.query(`CREATE TABLE IF NOT EXISTS files (
    id serial PRIMARY KEY,
    hash varchar(32) NOT NULL UNIQUE,
    name varchar(100) NOT NULL,
    extension varchar(8) NOT NULL,
    type varchar(255) NOT NULL,
    size integer NOT NULL,
    width integer,
    height integer,
    length integer,
    ip_id integer NOT NULL REFERENCES ips (id) ON DELETE RESTRICT,
    created_at timestamp with time zone NOT NULL
  )`);

  await client.query(`CREATE INDEX IF NOT EXISTS files_hash_idx ON files (hash)`);

  await client.query(`CREATE TABLE IF NOT EXISTS posts_files (
    id serial PRIMARY KEY,
    post_id integer REFERENCES posts (id) ON DELETE CASCADE,
    file_id integer REFERENCES files (id) ON DELETE CASCADE
  )`);

  await client.query(`CREATE INDEX IF NOT EXISTS posts_files_post_id_idx ON posts_files (post_id)`);
}
