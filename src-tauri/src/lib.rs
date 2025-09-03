mod types;
use crate::types::{RemoteServer, ValueString};
mod mysql;
use crate::mysql::actually_sync_databases_mysql;
mod migrations;
use crate::migrations::{SQLITE_MIGRATIONS, MYSQL_PG_MIGRATIONS};

use tauri::State;
use tauri_plugin_sql::{Migration, MigrationKind, MigrationList, DbInstances, DbPool};
use chrono::{DateTime, Utc};
use log::{warn, info, debug};
use pulldown_cmark as md;
use asciidocr as adoc;
use lazy_static::lazy_static;
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

#[tauri::command]
fn render_md(value: &str) -> String {
    let mut options = md::Options::empty();

    options.insert(md::Options::ENABLE_TABLES);
    options.insert(md::Options::ENABLE_FOOTNOTES);
    options.insert(md::Options::ENABLE_STRIKETHROUGH);
    options.insert(md::Options::ENABLE_TASKLISTS);
    options.insert(md::Options::ENABLE_SMART_PUNCTUATION);
    // options.insert(md::Options::ENABLE_MATH);
    options.insert(md::Options::ENABLE_GFM);
    options.insert(md::Options::ENABLE_DEFINITION_LIST);
    options.insert(md::Options::ENABLE_SUPERSCRIPT);
    options.insert(md::Options::ENABLE_SUBSCRIPT);

    let parser = md::Parser::new_ext(value, options);

    let mut output = String::new();
    md::html::push_html(&mut output, parser);
    output
}

#[tauri::command]
fn render_adoc(value: &str) -> Result<String, String> {
    let scanner = adoc::scanner::Scanner::new(value);
    let mut path = std::path::PathBuf::new();
    path.push(r".");
    let mut parser = adoc::parser::Parser::new(path);
    let asg = parser.parse(scanner).map_err(|e| e.to_string())?;
    adoc::backends::htmls::render_htmlbook(&asg).map_err(|e| e.to_string())
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
        .invoke_handler(tauri::generate_handler![sync_databases, check_database, render_md, render_adoc])
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
