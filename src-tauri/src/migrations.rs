// Copyright (C) 2025  Athan Clark
use lazy_static::lazy_static;
use tauri_plugin_sql::{Migration, MigrationKind, MigrationList, DbInstances, DbPool};

lazy_static! {
    pub static ref SQLITE_MIGRATIONS: MigrationList = MigrationList(vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            kind: MigrationKind::Up,
            sql: "
CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT,
    modified TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    book TEXT NOT NULL,
    name TEXT,
    content TEXT,
    syntax TEXT NOT NULL DEFAULT ('md'),
    modified TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (book)
        REFERENCES books(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
",
        },
        Migration {
            version: 2,
            description: "create_default_book",
            kind: MigrationKind::Up,
            sql: "
INSERT OR IGNORE INTO books (id, name) VALUES ('default', 'default');
",
        },
        Migration {
            version: 3,
            description: "create_settings_tables",
            kind: MigrationKind::Up,
            sql: "
CREATE TABLE IF NOT EXISTS remote_servers (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    db_type TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    db TEXT NOT NULL,
    user TEXT NOT NULL,
    password TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
",
        },
        Migration {
            version: 4,
            description: "add_icons_to_books_and_documents",
            kind: MigrationKind::Up,
            sql: "
ALTER TABLE books ADD COLUMN icon TEXT;
ALTER TABLE books ADD COLUMN icon_color TEXT;
ALTER TABLE documents ADD COLUMN icon TEXT;
ALTER TABLE documents ADD COLUMN icon_color TEXT;
",
        },
        Migration {
            version: 5,
            description: "auto_modify_datetime",
            kind: MigrationKind::Up,
            sql: "
CREATE TRIGGER update_modified_books
AFTER UPDATE ON books
FOR EACH ROW
BEGIN
    UPDATE books
    SET modified = datetime('now')
    WHERE id = NEW.id;
END;
CREATE TRIGGER update_modified_documents
AFTER UPDATE ON documents
FOR EACH ROW
BEGIN
    UPDATE documents
    SET modified = datetime('now')
    WHERE id = NEW.id;
END;
",
        },
        Migration {
            version: 6,
            description: "trash",
            kind: MigrationKind::Up,
            sql: "
ALTER TABLE books ADD COLUMN trash INTEGER NOT NULL DEFAULT 0
CHECK (trash IN (0, 1));
INSERT OR IGNORE INTO books (id, name) VALUES ('trash', 'Trash');
",
        },
        Migration {
            version: 7,
            description: "permanently_deleted",
            kind: MigrationKind::Up,
            sql: "
CREATE TABLE IF NOT EXISTS deleted (
    id TEXT PRIMARY KEY
);
",
        },
        Migration {
            version: 8,
            description: "make_sure_trash_actually_is_trash",
            kind: MigrationKind::Up,
            sql: "
UPDATE books SET trash = 1 WHERE id = 'trash';
",
        },
        Migration {
            version: 9,
            description: "delete_trigger_for_permanently_deleted",
            kind: MigrationKind::Up,
            sql: "
CREATE TRIGGER populate_deleted_book
AFTER DELETE ON books
FOR EACH ROW
BEGIN
    INSERT INTO deleted (id) VALUES (OLD.id);
END;
CREATE TRIGGER populate_deleted_document
AFTER DELETE ON documents
FOR EACH ROW
BEGIN
    INSERT INTO deleted (id) VALUES (OLD.id);
END;
",
        },
        Migration {
            version: 10,
            description: "better_auto_modify_datetime",
            kind: MigrationKind::Up,
            // NOTE: This is basically saying, if NEW.modified is the same as OLD.modified (i.e., a
            // new modification date wasn't supplied), then generate a new one.
            sql: "
DROP TRIGGER IF EXISTS update_modified_books;
CREATE TRIGGER update_modified_books
AFTER UPDATE ON books
FOR EACH ROW
WHEN NEW.modified IS OLD.modified
BEGIN
    UPDATE books
    SET modified = datetime('now')
    WHERE id = NEW.id;
END;
DROP TRIGGER IF EXISTS update_modified_documents;
CREATE TRIGGER update_modified_documents
AFTER UPDATE ON documents
FOR EACH ROW
WHEN NEW.modified IS OLD.modified
BEGIN
    UPDATE documents
    SET modified = datetime('now')
    WHERE id = NEW.id;
END;
",
        },
    ]);

    pub static ref MYSQL_MIGRATIONS: MigrationList = MigrationList(vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            kind: MigrationKind::Up,
            sql: "
CREATE TABLE IF NOT EXISTS books (
    id VARCHAR(32) PRIMARY KEY,
    name TEXT,
    modified TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(32) PRIMARY KEY,
    book VARCHAR(32) NOT NULL,
    name TEXT,
    content TEXT,
    syntax TEXT NOT NULL,
    modified TIMESTAMP NOT NULL,
    FOREIGN KEY (book)
        REFERENCES books(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
",
        },
        Migration {
            version: 3,
            description: "add_icons_to_books_and_documents",
            kind: MigrationKind::Up,
            sql: "
ALTER TABLE books ADD COLUMN icon TEXT;
ALTER TABLE books ADD COLUMN icon_color TEXT;
ALTER TABLE documents ADD COLUMN icon TEXT;
ALTER TABLE documents ADD COLUMN icon_color TEXT;
",
        },
        Migration {
            version: 4,
            description: "trash",
            kind: MigrationKind::Up,
            sql: "
ALTER TABLE books ADD COLUMN trash INTEGER NOT NULL DEFAULT 0
CHECK (trash IN (0, 1));
",
        },
        Migration {
            version: 5,
            description: "permanently_deleted",
            kind: MigrationKind::Up,
            sql: "
CREATE TABLE IF NOT EXISTS deleted (
    id VARCHAR(32) PRIMARY KEY
);
",
        },
    ]);

    pub static ref PG_MIGRATIONS: MigrationList = MigrationList(vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            kind: MigrationKind::Up,
            sql: "
CREATE TABLE IF NOT EXISTS books (
    id VARCHAR(32) PRIMARY KEY,
    name TEXT,
    modified TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(32) PRIMARY KEY,
    book VARCHAR(32) NOT NULL,
    name TEXT,
    content TEXT,
    syntax TEXT NOT NULL,
    modified TIMESTAMP NOT NULL,
    FOREIGN KEY (book)
        REFERENCES books(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
",
        },
        Migration {
            version: 3,
            description: "add_icons_to_books_and_documents",
            kind: MigrationKind::Up,
            sql: "
ALTER TABLE books ADD COLUMN icon TEXT;
ALTER TABLE books ADD COLUMN icon_color TEXT;
ALTER TABLE documents ADD COLUMN icon TEXT;
ALTER TABLE documents ADD COLUMN icon_color TEXT;
",
        },
        Migration {
            version: 4,
            description: "trash",
            kind: MigrationKind::Up,
            sql: "
ALTER TABLE books ADD COLUMN trash INTEGER NOT NULL DEFAULT 0
CHECK (trash IN (0, 1));
",
        },
        Migration {
            version: 5,
            description: "permanently_deleted",
            kind: MigrationKind::Up,
            sql: "
CREATE TABLE IF NOT EXISTS deleted (
    id VARCHAR(32) PRIMARY KEY
);
",
        },
        Migration {
            version: 6,
            description: "utc_timestamp",
            kind: MigrationKind::Up,
            sql: "
ALTER TABLE books ALTER COLUMN modified TYPE TIMESTAMPTZ;
ALTER TABLE documents ALTER COLUMN modified TYPE TIMESTAMPTZ;
",
        },
    ]);
}

