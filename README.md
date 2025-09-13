# Scriptorium

> A Simple Note-Taking Application

Scriptorium is an application for taking notes. It's inspired by [Joplin](https://joplinapp.org/), but has
a few distinct design decisions that differentiate it:

- Support for [Markdown](https://www.markdownguide.org/), [ASCIIDoc](https://asciidoc.org/), and HTML as note-taking
  syntaxes. It's designed to expand on these in the future, for instance [reStructuredText](https://www.sphinx-doc.org/en/master/usage/restructuredtext/basics.html).
- Data is stored locally in a [SQLite](https://www.sqlite.org/) database, and remotely with either [MySQL](https://www.mysql.com/) or
  [PostgreSQL](https://www.postgresql.org/) ([MariaDB](https://mariadb.org/) and [MSSQL](https://www.microsoft.com/en-us/sql-server) are planned).
- Change Management for data between remote and local databases tries to be as logical and recoverable as possible -- data deletion
  is discouraged at the user-level whenever possible, which leads to easier unification between databases.
- Supoport for mobile is planned but not yet implemented (the application is built on [Tauri](https://v2.tauri.app/)).

## Installation

In the [Releases Page](https://github.com/athanclark/scriptorium/releases), you'll find the latest released and published binaries for your
operating system.

## Issues

If the application is broken, whether technically or philosophically, please [file a report](https://github.com/athanclark/scriptorium/issues).
I am not responsible for your information getting deleted, stolen, or otherwise compromised. See the [License]() for details.

## Building from Source



```bash
pnpm install
pnpm tauri dev
```

