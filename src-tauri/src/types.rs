use chrono::{DateTime, Utc};

#[derive(sqlx::FromRow, Debug, Clone)]
pub struct RemoteServer {
    pub id: String,
    pub host: String,
    pub port: u16,
    pub db: String,
    pub user: String,
    pub password: String,
    pub db_type: String,
}

#[derive(sqlx::FromRow, Debug, Clone)]
pub struct ValueString {
    pub value: String,
}

#[derive(sqlx::FromRow, Debug, Clone)]
pub struct IdAndModified {
    pub id: String,
    pub modified: DateTime<Utc>,
}

#[derive(sqlx::FromRow, Debug, Clone)]
pub struct Id {
    pub id: String,
}
