---
title: SQLite Gotchas (coming from Postgres)
date: 2023-06-28
---

SQLite is a fantastic database for many situations due to its simplicity and ease of use. However,
when migrating from a more comprehensive DBMS like PostgreSQL or MySQL, you may encounter some
unexpected differences. Here are a few key "gotchas" to keep in mind:

- **SQLite is typeless**: This means that you can store any kind of data in any column, regardless
  of the column's declared type. However, as of SQLite version 3.37.0 (2021-11-27), SQLite
  introduced a feature called [`STRICT`](https://sqlite.org/stricttables.html) tables that enforces
  strict typing on table columns. This mode is enabled separately for each table. In a
  `CREATE TABLE` statement, if the "STRICT" table-option keyword is added to the end, then strict
  typing rules apply to that table. This strictness requires every column definition to specify a
  datatype and enforces that inserted data must be either NULL (if there is no NOT NULL constraint)
  or of the type specified. Datatypes must be one of INT, INTEGER, REAL, TEXT, BLOB, ANY.
- **Limited ALTER TABLE command**: SQLite's ALTER TABLE command allows you to rename a table, rename
  a column, add a new column, or drop a column, but other alterations like changing a column's type,
  adding a `NOT NULL`, or modifying constraints are not directly supported. However, [a
  workaround](https://www.sqlite.org/lang_altertable.html#otheralter) involving creating a new table
  with the desired changes, copying data, and then renaming the new table to the old one's name can
  be used.
- **Lack of concurrent writes**: SQLite allows multiple processes to have the database file open at
  once, and multiple processes can be doing a SELECT at the same time. But for writing, only one
  process can be doing that at once. This means SQLite may not be suitable for write-heavy
  applications. Open source forks like [sqld](https://github.com/libsql/sqld) are solving this.
- **Foreign keys are not enforced by default**: In SQLite, foreign key constraints are not enforced
  by default. You must enable this feature manually using `PRAGMA foreign_keys = ON;`. Without this,
  the database won't prevent you from inserting rows that violate foreign key constraints.

Despite its original design as a compact and embeddable database, SQLite offers an impressive array
of features that make it highly versatile for various applications. Its support for **window
functions**, **JSON functions**, and a rich suite of date and time functions, enables developers to
perform complex operations and queries within the database.

Recently, SQLite's use cases have been expanding beyond on-device and embedded applications via open
source forks of the project. Its robustness, flexibility, and ease of use have led to it being
adapted into a managed cloud offering, with features such as database replication and distributed
writes to edge locations. This evolution effectively brings SQLite's power to networked use cases,
such as acting as the primary database for APIs and dynamic websites.

With its ongoing development and feature enhancement, SQLite has proven to be more than just a
"lite" database. Its transition from purely local storage to a cloud-enabled, distributed database
showcases its adaptability and potential to cater to a wider array of applications, making it a
popular choice for developers globally. The balance it strikes between simplicity, compactness, and
functionality is a testament to its robust design and broad applicability.

SQLite has committed to an incredible degree of stability. The Library of Congress has enlisted
SQLite as one of its preferred file formats for dataset archival, along with XML, JSON, and CSV.
Although SQLite's code is open, the core developer team famously does not accept outside
contributions. Their published [code of ethics](https://sqlite.org/codeofethics.html) makes for
interesting reading.

### Resources

- **[SQLime](https://sqlime.org/about.html)**: SQLite browser playground
- **[Extensions](https://github.com/nalgeon/sqlean)**: A cleaned up collection of functions, a kind
  of standard library for SQLite
- **[Docs](https://sqlite.org/docs.html)**: The official documentation is _incredible_
- **[Simon Willison's blog](https://simonwillison.net/tags/sqlite/)**: SQLite specialist with a
  great blog - he also is the author of datasette and sqliteutils, tools worth checking out if you
  work with SQLite.
- **[Turso](http://turso.tech)**: Edge replication hosting for SQLite compatible databases. They
  also built sqld (in turn based on libsql, a fork and superset of SQLite) which enables concurrent
  network connections.
- **[Drizzle](https://orm.drizzle.team)**: A hybrid query builder and ORM (why not both?!) for
  TypeScript. Drizzle kit is its sister library for managing migrations, which can be super tricky
  in SQLite.
- **[Kysely](https://kysely-org.github.io/kysely/index.html)**: A pure query builder, Drizzle is
  more complete (adding an ORM and CLI toolkit) but Kysely is more of a specialist tool for building
  queries with typed results.
- **[LiteFS by Fly.io](https://fly.io/docs/litefs/)**: Another distributed cloud SQLite solution.
