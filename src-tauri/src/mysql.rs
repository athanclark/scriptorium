use crate::types::{IdAndModified, Id, Book};
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
use std::collections::{HashMap, HashSet};
use chrono::{DateTime, Utc};

pub async fn actually_sync_databases_mysql(
    local_conn: &Pool<Sqlite>,
    remote_conn: &Pool<MySql>,
) -> Result<bool, String> {
    let mut has_modified = false;

    {
        // NOTE: Sync Deleted Books /////////////////////////////////
        let all_local_deletions: Vec<Id> =
            sqlx::query_as("SELECT id FROM deleted")
            .fetch_all(local_conn)
            .await
            .map_err(|e| e.to_string())?;
        let all_remote_deletions: Vec<Id> =
            sqlx::query_as("SELECT id FROM deleted")
            .fetch_all(remote_conn)
            .await
            .map_err(|e| e.to_string())?;
        let all_local_deletions: HashSet<String> = all_local_deletions
            .into_iter()
            .map(|kv| kv.id)
            .collect();
        let all_remote_deletions: HashSet<String> = all_remote_deletions
            .into_iter()
            .map(|kv| kv.id)
            .collect();
        let local_to_delete = all_remote_deletions.difference(&all_local_deletions);
        let remote_to_delete = all_local_deletions.difference(&all_remote_deletions);

        {
            // NOTE: Remove from local first
            let mut add_to_delete_table = QueryBuilder::<Sqlite>::new("INSERT INTO deleted (id)");
            add_to_delete_table.push_values(local_to_delete.clone(), |mut builder, to_delete| {
                has_modified = true;
                builder.push_bind(to_delete);
            });
            add_to_delete_table.build().execute(local_conn).await.map_err(|e| e.to_string())?;

            let mut remove_from_documents = QueryBuilder::<Sqlite>::new("DELETE FROM documents WHERE id IN (");
            let mut sep = remove_from_documents.separated(", ");
            for id in local_to_delete.clone() {
                has_modified = true;
                sep.push_bind(id);
            }
            sep.push_unseparated(")");
            let query = remove_from_documents.build();
            query.execute(local_conn).await.map_err(|e| e.to_string())?;

            let mut remove_from_books = QueryBuilder::<Sqlite>::new("DELETE FROM books WHERE id IN (");
            let mut sep = remove_from_books.separated(", ");
            for id in local_to_delete {
                has_modified = true;
                sep.push_bind(id);
            }
            sep.push_unseparated(")");
            let query = remove_from_books.build();
            query.execute(local_conn).await.map_err(|e| e.to_string())?;
        }
        
        {
            // NOTE: Remove remote second
            let mut add_to_delete_table = QueryBuilder::<MySql>::new("INSERT INTO deleted (id)");
            add_to_delete_table.push_values(remote_to_delete.clone(), |mut builder, to_delete| {
                has_modified = true;
                builder.push_bind(to_delete);
            });
            add_to_delete_table.build().execute(remote_conn).await.map_err(|e| e.to_string())?;

            let mut remove_from_documents = QueryBuilder::<MySql>::new("DELETE FROM documents WHERE id IN (");
            let mut sep = remove_from_documents.separated(", ");
            for id in remote_to_delete.clone() {
                has_modified = true;
                sep.push_bind(id);
            }
            sep.push_unseparated(")");
            let query = remove_from_documents.build();
            query.execute(remote_conn).await.map_err(|e| e.to_string())?;

            let mut remove_from_books = QueryBuilder::<MySql>::new("DELETE FROM books WHERE id IN (");
            let mut sep = remove_from_books.separated(", ");
            for id in remote_to_delete {
                has_modified = true;
                sep.push_bind(id);
            }
            sep.push_unseparated(")");
            let query = remove_from_books.build();
            query.execute(remote_conn).await.map_err(|e| e.to_string())?;
        }
    }

    {
        // NOTE: Sync Existing Books ///////////////////////////////
        let all_local_books: Vec<IdAndModified> =
            sqlx::query_as("SELECT id, modified FROM books")
            .fetch_all(local_conn)
            .await
            .map_err(|e| e.to_string())?;
        let all_remote_books: Vec<IdAndModified> =
            sqlx::query_as("SELECT id, modified FROM books")
            .fetch_all(remote_conn)
            .await
            .map_err(|e| e.to_string())?;
        let all_local_books: HashMap<String, DateTime<Utc>> = all_local_books
            .into_iter()
            .map(|kv| (kv.id, kv.modified))
            .collect();
        let all_remote_books: HashMap<String, DateTime<Utc>> = all_remote_books
            .into_iter()
            .map(|kv| (kv.id, kv.modified))
            .collect();
        let mut upsert_to_local: HashSet<String> = HashSet::new();
        for (remote_id, remote_modified) in &all_remote_books {
            match all_local_books.get(remote_id) {
                None => {
                    upsert_to_local.insert(remote_id.clone());
                },
                Some(local_modified) if remote_modified > local_modified => {
                    upsert_to_local.insert(remote_id.clone());
                },
                _ => {},
            }
        }
        let mut upsert_to_remote: HashSet<String> = HashSet::new();
        for (local_id, local_modified) in all_local_books.into_iter() {
            match all_remote_books.get(&local_id) {
                None => {
                    upsert_to_remote.insert(local_id);
                },
                Some(remote_modified) if local_modified > *remote_modified => {
                    upsert_to_remote.insert(local_id);
                },
                _ => {},
            }
        }
        if !upsert_to_local.is_empty() {
            // TODO: query all relevant fields for each book in `add_to_local` and `update_local`
            let mut query_builder = sqlx::QueryBuilder::new(
                "SELECT id, name, modofied, icon, icon_color, trash FROM books WHERE id IN ("
            );
            let mut sep = query_builder.separated(", ");
            for id in upsert_to_local.into_iter() {
                sep.push_bind(id);
            }
            sep.push_unseparated(")");

            let books: Vec<Book> = query_builder
                .build_query_as()
                .fetch_all(remote_conn)
                .await
                .map_err(|e| e.to_string())?;

            let mut query_builder = sqlx::QueryBuilder::new(
                "INSERT INTO books (id, name, modified, icon, icon_color, trash) "
            );
            query_builder.push_values(books, |mut book, row| {
                book.push_bind(row.id)
                    .push_bind(row.name)
                    .push_bind(row.modified)
                    .push_bind(row.icon)
                    .push_bind(row.icon_color)
                    .push_bind(row.trash);
            });

            query_builder.build().execute(local_conn).await.map_err(|e| e.to_string())?;
            // TODO: upsert all those books into the local db
        }
        {
            // TODO: query all relevant fields for each book in `add_to_remote` and `update_remote`
            // let books_to_add_to_remote = sqlx::query_as("SELECT id, ")
            // TODO: upsert all those books into the remote db
        }
        // let add_to_local = all_remote_books.difference(&all_local_books);
        // let add_to_remote = all_local_books.difference(&all_remote_books);
        
    }

    Ok(has_modified) // NOTE: return if changes were made
    // INFO: Get all remote books not in the local database
    // 
    // let mut query_builder = QueryBuilder::<MySql>::new("SELECT id, modified FROM books");
    // if !all_local_books.is_empty() {
    //     query_builder.push(" WHERE id NOT IN (");
    //     let mut sep = query_builder.separated(", ");
    //     for local_book in &all_local_books {
    //         sep.push_bind(local_book.id.clone());
    //     }
    //     sep.push_unseparated(")");
    // }
    // let e_remote_books: Result<Vec<IdAndModified>, String> = query_builder
    //     .build_query_as()
    //     .fetch_all(&conn)
    //     .await
    //     .map_err(|e| e.to_string());
    // match e_remote_books {
    //     Err(e) => {errors.push(e);},
    //     Ok(new_remote_books) if !new_remote_books.is_empty() => {
    //         ()               
    //     },
    //     _ => {},
    // }
}
