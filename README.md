<img src="assets/app-icon.svg" style="width: 200px; height: 200px" />

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

First, make sure you have the following installed:

- [Rust Toolchain](https://rustup.rs/) (just use the `stable` toolchain)
- [NodeJS](https://nodejs.org/en) (I'm using v24 on my development environment, but the GitHub build workflow is using version 22)
- [PNPM](https://pnpm.io/)
- [rsync](https://linux.die.net/man/1/rsync) (on windows it can be [installed via chocolatey](https://community.chocolatey.org/packages/rsync/5.4.1.1))
- [WebKit2 GTK 4.1](https://webkitgtk.org/reference/webkit2gtk/2.38.4/)

Then, install the dependencies

```bash
pnpm install
```

You can get a "live-reload" development system by running this:

```bash
pnpm tauri dev
```

And build a production version on your operating system with

```bash
NO_STRIP=1 pnpm tauri build
```

> The `NO_STRIP` variable is set because I can't get my AppImage linked libraries to get parsed without it. Idk.
