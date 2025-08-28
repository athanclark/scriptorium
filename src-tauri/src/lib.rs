mod types;
use crate::types::{RemoteServer, ValueString};
mod mysql;
use crate::mysql::actually_sync_databases_mysql;

use tauri::State;
use tauri_plugin_sql::{Migration, MigrationKind, MigrationList, DbInstances, DbPool};
use chrono::{DateTime, Utc};
use lazy_static::lazy_static;
use log::{warn, info, debug};
use sqlx::{
    Connection, 
    ConnectOptions,
    Pool,
    Database,
    QueryBuilder,
    MySql,
    Postgres,
    Sqlite,
    pool::PoolOptions,
    postgres::{PgConnectOptions, PgPool},
    mysql::{MySqlConnectOptions, MySqlPool},
    migrate::{Migrate, Migrator},
};
use std::{
    time::Duration,
    str::FromStr,
};


lazy_static! {
    static ref SQLITE_MIGRATIONS: MigrationList = MigrationList(vec![
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

    static ref MYSQL_PG_MIGRATIONS: MigrationList = MigrationList(vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            kind: MigrationKind::Up,
            sql: "
CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    name TEXT,
    modified DATETIME NOT NULL
);
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY,
    book TEXT NOT NULL,
    name TEXT,
    content TEXT,
    syntax TEXT NOT NULL,
    modified DATETIME NOT NULL,
    FOREIGN KEY (book)
        REFERENCES books(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
",
        },
        Migration {
            version: 2,
            description: "create_settings_tables",
            kind: MigrationKind::Up,
            sql: "
CREATE TABLE IF NOT EXISTS remote_servers (
    id TEXT PRIMARY KEY,
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
    id TEXT PRIMARY KEY
);
",
        },
        Migration {
            version: 6,
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


const DEFAULT_AUTO_SYNC_TIME: u32 = 5;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
async fn sync_databases(db_instances: State<'_, DbInstances>) -> Result<(), Vec<String>> {
    let instances = db_instances.0.read().await;

    let db = instances.get("sqlite:scriptorium.db").ok_or_else(|| vec!["database not loaded".to_string()])?;

    match db {
        DbPool::Sqlite(local_conn) => {
            let auto_sync_time: u32 = sqlx::query_as("SELECT value FROM settings WHERE key = 'auto_sync_time'")
                .fetch_all(local_conn)
                .await
                .map_err(|e| vec![e.to_string()])
                .and_then(|vs: Vec<ValueString>| {
                    if vs.len() > 0 {
                        u32::from_str(&vs[0].value).map_err(|e| vec![e.to_string()])
                    } else {
                        Ok(5)
                    }
                })?;
            let mut saved_dbs: Vec<RemoteServer> = sqlx::query_as("SELECT id, host, port, db, user, password, db_type FROM remote_servers")
                .fetch_all(local_conn)
                .await
                .map_err(|e| vec![e.to_string()])?;
            let mut changes_made = false;

            let mut errors: Vec<String> = vec![];
            // let pack_error = async |f, def| {
            //     let res = f().await;
            //     match res {
            //         Err(e) => {
            //             errors.push(e);
            //             def
            //         }
            //         Ok(x) => x,
            //     }
            // };
            // let pack_and_run_error = async |f, g, def| {
            //     let res = f().await;
            //     match res {
            //         Err(e) => {
            //             errors.push(e);
            //             g().await;
            //             def
            //         }
            //         Ok(x) => x,
            //     }
            // };

            let mut idx = 0;

            loop {
                debug!("Iterating");
                debug!("Saved rows: {:?}", saved_dbs);

                if saved_dbs.is_empty() {
                    debug!("saved are empty databases");
                    break;
                }
                if idx >= saved_dbs.len() {
                    idx = 0;
                    if !changes_made {
                        // NOTE: no changes have been made since the last cycle - all dbs are synced
                        break;
                    }
                    debug!("restarting database sync");
                }

                let saved_db = &saved_dbs[idx];

                match saved_db.db_type.as_str() {
                    "mysql" => {
                        let conn_options = MySqlConnectOptions::new()
                            .host(&saved_db.host)
                            .username(&saved_db.user)
                            .password(&saved_db.password)
                            .port(saved_db.port)
                            .database(&saved_db.db);
                        let e_conn: Result<MySqlPool, String> = run_migrations_and_get_pool(
                            conn_options,
                            MYSQL_PG_MIGRATIONS.clone(),
                            auto_sync_time,
                        ).await;
                        info!("e_conn returned");
                        match e_conn {
                            Ok(conn) => {
                                let e_caused_changes = actually_sync_databases_mysql(&local_conn, &conn).await;
                                match e_caused_changes {
                                    Err(e) => {errors.push(e);},
                                    Ok(caused_changes) => {
                                        changes_made = caused_changes || changes_made;
                                    }
                                }
                            },
                            Err(e) => {
                                errors.push(e.clone());
                                saved_dbs.remove(idx);
                                warn!("error, {e:?}, removing {idx}");
                            },
                        }
                    },
                    "postgresql" => {
                        let conn_options = PgConnectOptions::new()
                            .host(&saved_db.host)
                            .username(&saved_db.user)
                            .password(&saved_db.password)
                            .port(saved_db.port)
                            .database(&saved_db.db);
                        let e_conn: Result<PgPool, String> = run_migrations_and_get_pool(
                            conn_options,
                            MYSQL_PG_MIGRATIONS.clone(),
                            auto_sync_time,
                        ).await;
                        match e_conn {
                            Ok(conn) => {
                                // FIXME:
                                // let e_caused_changes = actually_sync_databases(&local_conn, &conn).await;
                                // match e_caused_changes {
                                //     Err(e) => {errors.push(e);},
                                //     Ok(caused_changes) => {
                                //         changes_made = caused_changes || changes_made;
                                //     }
                                // }
                            },
                            Err(e) => {
                                errors.push(e);
                                saved_dbs.remove(idx);
                            },
                        }
                    },
                    _ => {
                        errors.push(format!("Unrecognized database type: {:?}", saved_db.db_type));
                    },
                }

                idx += 1;
            }

            if errors.len() > 0 {
                Err(errors)
            } else {
                Ok(())
            }
        }
        _ => Err(vec!["unexpected primary database".to_string()]),
    }
}

#[tauri::command]
async fn check_database(db_instances: State<'_, DbInstances>, db_id: &str) -> Result<bool, String> {
    let instances = db_instances.0.read().await;

    let db = instances.get("sqlite:scriptorium.db").ok_or_else(|| "database not loaded".to_string())?;

    match db {
        DbPool::Sqlite(local_conn) => {
            let auto_sync_time: u32 = sqlx::query_as("SELECT value FROM settings WHERE key = 'auto_sync_time'")
                .fetch_all(local_conn)
                .await
                .map_err(|e| e.to_string())
                .and_then(|vs: Vec<ValueString>| {
                    if vs.len() > 0 {
                        u32::from_str(&vs[0].value).map_err(|e| e.to_string())
                    } else {
                        Ok(5)
                    }
                })?;
            let saved_db: RemoteServer = sqlx::query_as("SELECT id, host, port, db, user, password, db_type FROM remote_servers WHERE id = ?")
                .bind(db_id)
                .fetch_one(local_conn)
                .await
                .map_err(|e| e.to_string())?;

            println!("Saved row: {:?}", saved_db);

            match saved_db.db_type.as_str() {
                "mysql" => {
                    let conn_options = MySqlConnectOptions::new()
                        .host(&saved_db.host)
                        .username(&saved_db.user)
                        .password(&saved_db.password)
                        .port(saved_db.port)
                        .database(&saved_db.db);
                    let conn: MySqlPool = run_migrations_and_get_pool(
                        conn_options,
                        MYSQL_PG_MIGRATIONS.clone(),
                        auto_sync_time,
                    ).await?;
                    // let conn = MySqlPool::connect_with(conn_options).await.map_err(|e| e.to_string())?;
                    // let migrator = Migrator::new(MIGRATIONS.clone()).await.map_err(|e| e.to_string())?;
                    // migrator.run(&conn).await.map_err(|e| e.to_string())?;
                    Ok(true)
                },
                "postgresql" => {
                    let conn_options = PgConnectOptions::new()
                        .host(&saved_db.host)
                        .username(&saved_db.user)
                        .password(&saved_db.password)
                        .port(saved_db.port)
                        .database(&saved_db.db);
                    let conn: PgPool = run_migrations_and_get_pool(
                        conn_options,
                        MYSQL_PG_MIGRATIONS.clone(),
                        auto_sync_time,
                    ).await?;
                    // let conn = PgPool::connect_with(conn_options).await.map_err(|e| e.to_string())?;
                    // let migrator = Migrator::new(MIGRATIONS.clone()).await.map_err(|e| e.to_string())?;
                    // migrator.run(&conn).await.map_err(|e| e.to_string())?;
                    Ok(true)
                },
                _ => {
                    Err(format!("Unrecognized database type: {:?}", saved_db.db_type))
                }
            }
        }
        _ => Err("unexpected primary database".to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        // .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:scriptorium.db", SQLITE_MIGRATIONS.0.clone())
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![sync_databases, check_database])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn run_migrations_and_get_pool<DB: Database>(
    conn_options: <<DB as Database>::Connection as Connection>::Options,
    migrations: MigrationList,
    auto_sync_time: u32,
) -> Result<Pool<DB>, String>
where
    <DB as Database>::Connection: Migrate
{
    let conn = PoolOptions::new()
        .acquire_timeout(Duration::from_secs(auto_sync_time as u64 - 1))
        .connect_with(conn_options)
        .await
        .map_err(|e| e.to_string())?;
    debug!("pool established");
    let migrator = Migrator::new(migrations).await.map_err(|e| e.to_string())?;
    debug!("migrator created");
    migrator.run(&conn).await.map_err(|e| e.to_string())?;
    debug!("migrations run");
    Ok(conn)
}
