use tauri::State;
use tauri_plugin_sql::{Migration, MigrationKind, MigrationList, DbInstances, DbPool};
use lazy_static::lazy_static;
use sqlx::{Connection};


lazy_static! {
    static ref MIGRATIONS: MigrationList = MigrationList(vec![
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
    ]);
}

#[derive(sqlx::FromRow, Debug, Clone)]
struct RemoteServer {
    host: String,
    port: u16,
    db: String,
    user: String,
    password: String,
    db_type: String,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
async fn sync_databases(db_instances: State<'_, DbInstances>) -> Result<(), String> {
    let instances = db_instances.0.read().await;

    let db = instances.get("sqlite:scriptorium.db").ok_or_else(|| "database not loaded".to_string())?;

    match db {
        DbPool::Sqlite(pool) => {
            let saved_dbs: Vec<RemoteServer> = sqlx::query_as("SELECT host, port, db, user, password, db_type FROM remote_servers")
                .fetch_all(pool)
                .await
                .map_err(|e| e.to_string())?;

            println!("Saved rows: {:?}", saved_dbs);

            Ok(())
        }
        _ => Err("unexpected database".to_string()),
    }
}

#[tauri::command]
async fn check_database(db_instances: State<'_, DbInstances>, db_id: &str) -> Result<bool, String> {
    let instances = db_instances.0.read().await;

    let db = instances.get("sqlite:scriptorium.db").ok_or_else(|| "database not loaded".to_string())?;

    match db {
        DbPool::Sqlite(pool) => {
            let saved_db: RemoteServer = sqlx::query_as("SELECT host, port, db, user, password, db_type FROM remote_servers WHERE id = ?")
                .bind(db_id)
                .fetch_one(pool)
                .await
                .map_err(|e| e.to_string())?;

            println!("Saved row: {:?}", saved_db);

            Ok(true)
        }
        _ => Err("unexpected database".to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:scriptorium.db", (*MIGRATIONS).0.clone())
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![sync_databases])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
