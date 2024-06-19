---
title: Use a diff tool for SQL migrations
date: 2024-05-22
---

After extensive work with SQL database migrations, I’ve concluded that the best approach is
utilizing a “diff tool” like [Atlas](https://atlasgo.io) or
[migra](https://github.com/djrobstep/migra) (Postgres only). This method involves creating a fresh
instance from declarative models (e.g., Prisma, SQLAlchemy or Drizzle) and comparing it with the
production or development instance. Here’s why this strategy is superior:

1. **Accurate Drafts**: A diff tool drafts migrations based on the real differences between your
   declarative definitions and the production schema. This ensures that the generated migration
   scripts are precise and relevant. Any accidental drift in schemas is detected and highlighted.
2. **Manual Control**: You can review and modify the migration script before it’s applied. This is
   crucial because complex migrations often require nuanced adjustments that automated tools might
   miss.
3. **Safety First**: By adding the migration script to a PR as a file and applying it manually
   before or after merging, you maintain control over the process. This reduces the risk of
   automated CI tools wreaking havoc on your database with premature or incorrect migrations.
4. **Testing on Clones**: If needed, you can clone the production database and test the migration.
   This step is invaluable for ensuring that everything will run smoothly when you apply the changes
   to the live environment.
5. **Avoiding Pitfalls**: Forget “down” scripts and auto-apply in CI. These shortcuts can lead to
   disaster, especially in complex migrations that require careful orchestration, multi-step
   processes, and monitoring for locking issues.
6. **Skill Building**: Complex migrations necessitate hand-holding and a deep understanding of your
   database’s behavior. Embrace this as an opportunity to get good at managing intricate database
   changes. Your future self (and your database) will thank you.

In summary, a diff tool approach gives you the precision, control, and safety needed for effective
SQL database migrations.

## Using Atlas with Drizzle and Turso

My particular setup today uses Turso (hosted libsql with built in replication) with Drizzle for
querying and declaring schemas in TypeScript. This is a fork of SQLite and one of the biggest
gotchas with SQLite is that it has poor (although improving) support for `ALTER TABLE` /
`ALTER COLUMN` commands. Since libsql is a fork there's efforts alongside the core SQLite developments to
improve the situation. But as of yet, many `ALTER COLUMN` scenarios are not supported, and for when
libsql has added support for them, it does not add and enforce any new constraints on existing data,
only for new data.

So how to manage migrations like adding `NULL` constraints to a column?

In Postgres it's a simple `ALTER COLUMN column SET NOT NULL`. In SQLite it's a multi-step process:

1. Creating a temporary table where the table schema has the column with a null constraint
2. Copy data from the old table to new table
3. Drop the new table (scary!)
4. Rename new table to old table

When modifying columns with foreign key constraints it can also be important to switch foreign key
PRAGMA:

```sql
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
-- migrations
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
```

Atlas is a purpose built tool to manage different styles of migration. It has extensive support for
databases and intelligently handles migration steps. In my opinion its killer feature is to be able
to introspect two SQL schemas, derive an internal abstraction, diff the two and produce the
migration script - all in one go.

```
atlas schema diff \
  --dev-url "sqlite://dev?mode=memory" \
  --from libsql+ws://127.0.0.1:3030 \
  --to file://schema.sql \
  --format '{{ sql . "  " }}'
```

This tells atlas to look at a local db and compare it to an sql file schema that is temporarily
loaded into memory, then diff and produce a script — that format bit is just to add indentation.

But where does that schema.sql come from? In my monorepo I've set up a package that is purpose made
for migrations. It has drizzle and drizzle kit, imports the project schema from a sibling package
and uses drizzle-kit to create the schema.sql.

I've made a simple bun `diff.ts` script to tie all of this together:

```ts
import { $ } from 'bun';

// Make a genesis migration giving us all the SQL DDL statements
await $`pnpm drizzle-kit generate:sqlite`.quiet();

// Echo the output to schema.sql (should just be a single file)
await $`cat migrations/*.sql > schema.sql`.quiet();

// Get Atlas migrations
await $`atlas schema diff --dev-url "sqlite://dev?mode=memory" --from libsql+ws://127.0.0.1:3030 --to file://schema.sql --format '{{ sql . "  " }}'`;

// And cleanup
await $`rm -rf migrations/*`.quiet();
```

Drizzle-to-Atlas Gotcha: For some reason the `DEFAULT`'s' for many created/modified timestamps were
`strftime ('%s', 'now')` with a space after the function name. This resulted in a mysteriour
zero-effect migration for most of my tables. I decided not to dig deeper and just go ahead with the
migration. You might encounter similar cases of hard-to-detect changes. Copying and renaming every
table ended up being a good test drive of Atlas 😅.

Keep in mind we have three "schemas" to think about here. One is the drizzle _declarative schema_
from which we want to derive everything, written in TypeScript, and allows us to work on new
features while delaying actual migration steps (I actually consider this the [coolest feature of
Drizzle](https://medium.com/drizzle-stories/the-data-access-pattern-first-approach-with-drizzle-bca035bbdc63)
and Kysely — you can work on features with a fair degree of confidence in your schema changes before
actually running migrations, which would be noisy and painful as the schema goes through adjustments
based on feature work). The middle schema is in-memory one maintained temporarily by Atlas to create
its internal "goal" schema structure. The final schema is the actual migrated one in your dev db
(libsql local server in my case).

Drizzle-Kit handles migrations but not complex ones. Atlas has a better feature set, so we use
drizzle-kit to produce a clean initial migration. Since it's observing an empty migrations folder in
this purpose made monorepo package it thinks we're starting from a clean slate and produces the
correct schema.

Let's see how Atlas handles complex migrations that would trip up Drizzle-Kit (sidenote, complex
SQLite migrations are on the drizzle roadmap!).

We'll start with a Dog model.

```ts
export const Dog = sqliteTable('dog', {
	id: text('id').primaryKey().notNull(),
	created: integer('created', { mode: 'timestamp' }).default(sql`(strftime('%s', 'now'))`),
	name: text('name').notNull()
});
```

Running `bun diff.ts` gives us:

```sql
-- Create "dog" table
CREATE TABLE `dog` (
  `id` text NOT NULL,
  `created` integer NULL DEFAULT (strftime('%s', 'now')),
  `name` text NOT NULL,
  PRIMARY KEY (`id`)
);
```

Now lets make two modifications; rename `name` to `full_name` and add a `NOT NULL` constraint to
created which we forgot.

```ts
export const Dog = sqliteTable('dog', {
	id: text('id').primaryKey().notNull(),
	created: integer('created', { mode: 'timestamp' })
		.default(sql`(strftime('%s', 'now'))`)
		.notNull(),
	fullName: text('full_name').notNull()
});
```

Atlas has detected a potential rename and asks us:

```
? Did you rename "dog" column from "name" to "full_name":
  ▸ Yes
    No
```

We'll choose yes:

```sql
-- Disable the enforcement of foreign-keys constraints
PRAGMA foreign_keys = off;
-- Create "new_dog" table
CREATE TABLE `new_dog` (
  `id` text NOT NULL,
  `created` integer NOT NULL DEFAULT (strftime('%s', 'now')),
  `full_name` text NOT NULL,
  PRIMARY KEY (`id`)
);
-- Copy rows from old table "dog" to new temporary table "new_dog"
INSERT INTO `new_dog` (`id`, `created`, `full_name`) SELECT `id`, IFNULL(`created`, (strftime('%s', 'now'))) AS `created`, `name` FROM `dog`;
-- Drop "dog" table after copying rows
DROP TABLE `dog`;
-- Rename temporary table "new_dog" to "dog"
ALTER TABLE `new_dog` RENAME TO `dog`;
-- Enable back the enforcement of foreign-keys constraints
PRAGMA foreign_keys = on;
```

What's really cool is how Atlas not only creates a new table to get around SQLite limitations, but
intelligently backfills the column value in case there's any existing `NULL` values in the table.
Without specifying a `.default()` in Drizzle we might encounter an error — Atlas does not yet scan
the table for potential issues, but has a best effort strategy to prevent migration failures.

If you like the migrations you can pipe them directly via the turso client:

```
bun diff.ts | turso db shell http://localhost:8080
```

Not only have we generated a migration based on schema changes, but we've ensured there isn't any
accidental drift in the schema coming from other potential upstream migrations. Why would this
happen? Because of concurrent and cancelled PR's — and just generally non-linearity of how the
schema involves! Let's say you start a feature, abandon it but forget to clean up the schema
migrations. A diff function catches those instances.

If this happens to your live database, Atlas can also be pointed at a live instance to report any
drift there.
