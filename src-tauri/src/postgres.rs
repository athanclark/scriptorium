// Copyright (C) 2025  Athan Clark
use crate::types::{Book, Document, Id, IdAndModified};
use chrono::{DateTime, Utc};
use sqlx::{
    migrate::{Migrate, Migrator},
    pool::PoolOptions,
    postgres::{PgConnectOptions, PgPool},
    ConnectOptions, Connection, Database, Pool, Postgres, QueryBuilder, Sqlite,
};
use std::collections::{HashMap, HashSet};

pub async fn actually_sync_databases_postgres(
    local_conn: &Pool<Sqlite>,
    remote_conn: &Pool<Postgres>,
) -> Result<bool, String> {
    let mut has_modified = false;

    {
        // NOTE: Sync Deleted Books /////////////////////////////////
        let all_local_deletions: Vec<Id> = sqlx::query_as("SELECT id FROM deleted")
            .fetch_all(local_conn)
            .await
            .map_err(|e| e.to_string())?;
        let all_remote_deletions: Vec<Id> = sqlx::query_as("SELECT id FROM deleted")
            .fetch_all(remote_conn)
            .await
            .map_err(|e| e.to_string())?;
        let all_local_deletions: HashSet<String> =
            all_local_deletions.into_iter().map(|kv| kv.id).collect();
        let all_remote_deletions: HashSet<String> =
            all_remote_deletions.into_iter().map(|kv| kv.id).collect();
        let local_to_delete: HashSet<&String> = all_remote_deletions
            .difference(&all_local_deletions)
            .collect();
        let remote_to_delete: HashSet<&String> = all_local_deletions
            .difference(&all_remote_deletions)
            .collect();

        if !local_to_delete.is_empty() {
            // NOTE: Remove from local first
            let mut add_to_delete_table = QueryBuilder::<Sqlite>::new("INSERT INTO deleted (id)");
            add_to_delete_table.push_values(local_to_delete.clone(), |mut builder, to_delete| {
                has_modified = true;
                builder.push_bind(to_delete);
            });
            add_to_delete_table
                .build()
                .execute(local_conn)
                .await
                .map_err(|e| e.to_string())?;

            let mut remove_from_documents =
                QueryBuilder::<Sqlite>::new("DELETE FROM documents WHERE id IN (");
            let mut sep = remove_from_documents.separated(", ");
            for id in local_to_delete.clone() {
                has_modified = true;
                sep.push_bind(id);
            }
            sep.push_unseparated(")");
            let query = remove_from_documents.build();
            query.execute(local_conn).await.map_err(|e| e.to_string())?;

            let mut remove_from_books =
                QueryBuilder::<Sqlite>::new("DELETE FROM books WHERE id IN (");
            let mut sep = remove_from_books.separated(", ");
            for id in local_to_delete {
                has_modified = true;
                sep.push_bind(id);
            }
            sep.push_unseparated(")");
            let query = remove_from_books.build();
            query.execute(local_conn).await.map_err(|e| e.to_string())?;
        }

        if !remote_to_delete.is_empty() {
            // NOTE: Remove remote second
            let mut add_to_delete_table = QueryBuilder::<Postgres>::new("INSERT INTO deleted (id)");
            add_to_delete_table.push_values(remote_to_delete.clone(), |mut builder, to_delete| {
                has_modified = true;
                builder.push_bind(to_delete);
            });
            add_to_delete_table
                .build()
                .execute(remote_conn)
                .await
                .map_err(|e| e.to_string())?;

            let mut remove_from_documents =
                QueryBuilder::<Postgres>::new("DELETE FROM documents WHERE id IN (");
            let mut sep = remove_from_documents.separated(", ");
            for id in remote_to_delete.clone() {
                has_modified = true;
                sep.push_bind(id);
            }
            sep.push_unseparated(")");
            let query = remove_from_documents.build();
            query
                .execute(remote_conn)
                .await
                .map_err(|e| e.to_string())?;

            let mut remove_from_books =
                QueryBuilder::<Postgres>::new("DELETE FROM books WHERE id IN (");
            let mut sep = remove_from_books.separated(", ");
            for id in remote_to_delete {
                has_modified = true;
                sep.push_bind(id);
            }
            sep.push_unseparated(")");
            let query = remove_from_books.build();
            query
                .execute(remote_conn)
                .await
                .map_err(|e| e.to_string())?;
        }
    }

    {
        // NOTE: Sync Existing Books ///////////////////////////////
        let all_local_books: Vec<IdAndModified> = sqlx::query_as("SELECT id, modified FROM books")
            .fetch_all(local_conn)
            .await
            .map_err(|e| e.to_string())?;
        let all_remote_books: Vec<IdAndModified> = sqlx::query_as("SELECT id, modified FROM books")
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
                }
                Some(local_modified) if remote_modified > local_modified => {
                    upsert_to_local.insert(remote_id.clone());
                }
                _ => {}
            }
        }
        let mut upsert_to_remote: HashSet<String> = HashSet::new();
        for (local_id, local_modified) in all_local_books.into_iter() {
            match all_remote_books.get(&local_id) {
                None => {
                    upsert_to_remote.insert(local_id);
                }
                Some(remote_modified) if local_modified > *remote_modified => {
                    upsert_to_remote.insert(local_id);
                }
                _ => {}
            }
        }
        if !upsert_to_local.is_empty() {
            // TODO: query all fields from remote books that are slated to be upserted in local db
            let mut query_builder = sqlx::QueryBuilder::new(
                "SELECT id, name, modified, icon, icon_color, trash FROM books WHERE id IN (",
            );
            let mut sep = query_builder.separated(", ");
            for id in upsert_to_local.into_iter() {
                sep.push_bind(id);
            }
            sep.push_unseparated(") ");

            let books: Vec<Book> = query_builder
                .build_query_as()
                .fetch_all(remote_conn)
                .await
                .map_err(|e| e.to_string())?;

            let mut query_builder = sqlx::QueryBuilder::new(
                "INSERT INTO books (id, name, modified, icon, icon_color, trash) ",
            );
            query_builder.push_values(books, |mut sep, row| {
                sep.push_bind(row.id)
                    .push_bind(row.name)
                    .push_bind(row.modified)
                    .push_bind(row.icon)
                    .push_bind(row.icon_color)
                    .push_bind(row.trash);
                has_modified = true;
            });
            query_builder.push(" ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, modified = EXCLUDED.modified, icon = EXCLUDED.icon, icon_color = EXCLUDED.icon_color, trash = EXCLUDED.trash");

            query_builder
                .build()
                .execute(local_conn)
                .await
                .map_err(|e| e.to_string())?;
        }
        if !upsert_to_remote.is_empty() {
            // TODO: query all fields from local books that are slated to be upserted in remote db
            let mut query_builder = sqlx::QueryBuilder::new(
                "SELECT id, name, modified, icon, icon_color, trash FROM books WHERE id IN (",
            );
            let mut sep = query_builder.separated(", ");
            for id in upsert_to_remote.into_iter() {
                sep.push_bind(id);
            }
            sep.push_unseparated(") ");

            let books: Vec<Book> = query_builder
                .build_query_as()
                .fetch_all(local_conn)
                .await
                .map_err(|e| e.to_string())?;

            let mut query_builder = sqlx::QueryBuilder::new(
                "INSERT INTO books (id, name, modified, icon, icon_color, trash) ",
            );
            query_builder.push_values(books, |mut sep, row| {
                sep.push_bind(row.id)
                    .push_bind(row.name)
                    .push_bind(row.modified)
                    .push_bind(row.icon)
                    .push_bind(row.icon_color)
                    .push_bind(row.trash);
                has_modified = true;
            });
            query_builder.push(" ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, modified = EXCLUDED.modified, icon = EXCLUDED.icon, icon_color = EXCLUDED.icon_color, trash = EXCLUDED.trash");

            query_builder
                .build()
                .execute(remote_conn)
                .await
                .map_err(|e| e.to_string())?;
        }
    }

    {
        // NOTE: Sync Existing Documents ///////////////////////////////
        let all_local_documents: Vec<IdAndModified> =
            sqlx::query_as("SELECT id, modified FROM documents")
                .fetch_all(local_conn)
                .await
                .map_err(|e| e.to_string())?;
        let all_remote_documents: Vec<IdAndModified> =
            sqlx::query_as("SELECT id, modified FROM documents")
                .fetch_all(remote_conn)
                .await
                .map_err(|e| e.to_string())?;
        let all_local_documents: HashMap<String, DateTime<Utc>> = all_local_documents
            .into_iter()
            .map(|kv| (kv.id, kv.modified))
            .collect();
        let all_remote_documents: HashMap<String, DateTime<Utc>> = all_remote_documents
            .into_iter()
            .map(|kv| (kv.id, kv.modified))
            .collect();
        let mut upsert_to_local: HashSet<String> = HashSet::new();
        for (remote_id, remote_modified) in &all_remote_documents {
            match all_local_documents.get(remote_id) {
                None => {
                    upsert_to_local.insert(remote_id.clone());
                }
                Some(local_modified) if remote_modified > local_modified => {
                    upsert_to_local.insert(remote_id.clone());
                }
                _ => {}
            }
        }
        let mut upsert_to_remote: HashSet<String> = HashSet::new();
        for (local_id, local_modified) in all_local_documents.into_iter() {
            match all_remote_documents.get(&local_id) {
                None => {
                    upsert_to_remote.insert(local_id);
                }
                Some(remote_modified) if local_modified > *remote_modified => {
                    upsert_to_remote.insert(local_id);
                }
                _ => {}
            }
        }
        if !upsert_to_local.is_empty() {
            // TODO: query all fields from remote documents that are slated to be upserted in local db
            let mut query_builder = sqlx::QueryBuilder::new(
                "SELECT id, book, name, modified, content, syntax, icon, icon_color FROM documents WHERE id IN ("
            );
            let mut sep = query_builder.separated(", ");
            for id in upsert_to_local.into_iter() {
                sep.push_bind(id);
            }
            sep.push_unseparated(") ");

            let documents: Vec<Document> = query_builder
                .build_query_as()
                .fetch_all(remote_conn)
                .await
                .map_err(|e| e.to_string())?;

            let mut query_builder = sqlx::QueryBuilder::new(
                "INSERT INTO documents (id, book, name, modified, content, syntax, icon, icon_color) "
            );
            query_builder.push_values(documents, |mut sep, row| {
                sep.push_bind(row.id)
                    .push_bind(row.book)
                    .push_bind(row.name)
                    .push_bind(row.modified)
                    .push_bind(row.content)
                    .push_bind(row.syntax)
                    .push_bind(row.icon)
                    .push_bind(row.icon_color);
                has_modified = true;
            });
            query_builder.push(" ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, book = EXCLUDED.book, modified = EXCLUDED.modified, content = EXCLUDED.content, syntax = EXCLUDED.syntax, icon = EXCLUDED.icon, icon_color = EXCLUDED.icon_color");

            query_builder
                .build()
                .execute(local_conn)
                .await
                .map_err(|e| e.to_string())?;
        }
        if !upsert_to_remote.is_empty() {
            // TODO: query all fields from local documents that are slated to be upserted in remote db
            let mut query_builder = sqlx::QueryBuilder::new(
                "SELECT id, book, name, modified, content, syntax, icon, icon_color FROM documents WHERE id IN ("
            );
            let mut sep = query_builder.separated(", ");
            for id in upsert_to_remote.into_iter() {
                sep.push_bind(id);
            }
            sep.push_unseparated(") ");

            let documents: Vec<Document> = query_builder
                .build_query_as()
                .fetch_all(local_conn)
                .await
                .map_err(|e| e.to_string())?;

            let mut query_builder = sqlx::QueryBuilder::new(
                "INSERT INTO documents (id, book, name, modified, content, syntax, icon, icon_color) "
            );
            query_builder.push_values(documents, |mut sep, row| {
                sep.push_bind(row.id)
                    .push_bind(row.book)
                    .push_bind(row.name)
                    .push_bind(row.modified)
                    .push_bind(row.content)
                    .push_bind(row.syntax)
                    .push_bind(row.icon)
                    .push_bind(row.icon_color);
                has_modified = true;
            });
            query_builder.push(" ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, book = EXCLUDED.book, modified = EXCLUDED.modified, content = EXCLUDED.content, syntax = EXCLUDED.syntax, icon = EXCLUDED.icon, icon_color = EXCLUDED.icon_color");

            query_builder
                .build()
                .execute(remote_conn)
                .await
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(has_modified) // NOTE: return if changes were made
}
