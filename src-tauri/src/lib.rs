use tauri_plugin_sql::{Migration, MigrationKind};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
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
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:scriptorium.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
