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
pnpm tauri build
```

If you get an error regarding "failed to run linuxdeploy", your AppImage bundler might not be able to parse some shared libraries. You can skip some of
the symbol stripping with an environment variable:

```bash
NO_STRIP=1 pnpm tauri build
```

## Remote Server

Currently, Scriptorium supports [MySQL](https://www.mysql.com/) and [PostgreSQL](https://www.postgresql.org/) for storing data remotely. You can add your
connections under the "Settings" window.

It's assumed that your SQL server has a valid TLS/SSL certificate, and has been configured to use it. Here's a brief overview of getting [Let's Encrypt](https://letsencrypt.org/)
to repudiate and secure your SQL server:

**NOTE**: What I'm advising below may or may not be considered secure -- use your best judgement / company's best policies / security compliance directives when doing things
that could affect your systems' security.

### Getting Your Certificate

Because Let's Encrypt's CertBot relies on the public Internet to prove ownership of a FQDN, you'll need both a publically accessible server and a domain name pointing to it
(whether it's an A-record or CNAME is outside of the scope of this article).

From there, login to your remote machine and get yourself a certificate:

```bash
certbot certonly --standalone -d sql.example.com
```

> See [CertBot's website](https://certbot.eff.org/) for installation and usage on your platform.

CertBot will typically install your certs under `/etc/letsencrypt/archive/sql.example.com/`, linked from `/etc/letsencrypt/live/sql.example.com`. Typically, these
will be owned by the `root` user and the `root` group - specifically the `privkey.pem` file, which your SQL server will need access to. You'll have to decide how you'll go about
enabling access to that file, but me personally, I like to live dangerously, so I'm going to expand the attack surface for critical private keys and change the owning group
to a group also shared by the service that runs my SQL server.

### Reading The Certificates

For instance, if you have have a MySQL server installed and running with [SystemD](https://systemd.io/), typically it will be run under the `mysql` user (created when installing
the program). You'll see a similar effect when installing PostgreSQL the same way, which would be run by the `postgres` user. In both of these cases, I'll just add the user to
the `ssl-cert` group, which gets created by CertBot when installing the software:

```bash
usermod -a -G ssl-cert {mysql, postgres}
```

In a similar light, I'll change the _group_ ownership of my certificates to that very same group:

```bash
chown -R root:ssl-cert /etc/letsencrypt/{archive,live}/sql.example.com
```

Furthermore, I'll have to grant the group read-access to `privkey.pem`:

```bash
chmod g+r /etc/letsencrypt/archive/sql.example.com/privkey*
```

This will now allow our `mysql` or `postgres` user to read those certificates and execute directory search on those folders.

### Configuring MySQL

For MySQL, you'll have to adjust your `mysqld.conf` file (typically anyway -- your system may differ):

```conf
# TLS
ssl_cert = /etc/letsencrypt/live/sql.example.com/cert.pem
ssl_key  = /etc/letsencrypt/live/sql.example.com/privkey.pem
ssl_ca   = /etc/letsencrypt/live/sql.example.com/chain.pem

# Prefer modern protocols
tls_version = TLSv1.2,TLSv1.3

# (MySQL 5.7+/8.0 and MariaDB 10.6+)
require_secure_transport = ON   # force TLS for all non-local connections
```

I just appended this to my `mysqld.conf` file.

### Configuring PostgreSQL

Similarly, here's the configuration for `postgresql.conf`:

```conf
ssl = on
ssl_cert_file = '/etc/letsencrypt/live/sql.example.com/fullchain.pem'
ssl_key_file  = '/etc/letsencrypt/live/sql.example.com/privkey.pem'
ssl_ca_file   = '/etc/letsencrypt/live/sql.example.com/chain.pem'
ssl_min_protocol_version = 'TLSv1.2'
```

Restarting either server after configuring this should enable SSL/TLS for your servers. This is important because we don't want our database's passwords
getting leaked to the Internet for every connection.
