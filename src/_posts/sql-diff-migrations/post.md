---
title: Use a diff tool for SQL migrations
date: 2024-05-22
---

After extensive work with SQL database migrations, I’ve concluded that the best approach is utilizing a “diff tool” like [Atlas](https://atlasgo.io) or [migra](https://github.com/djrobstep/migra) (Postgres only). This method involves creating a fresh instance from declarative code definitions (e.g., SQLAlchemy ORM or Drizzle) and comparing it with the production database. Here’s why this strategy is superior:

1. **Accurate Drafts**: A diff tool drafts migrations based on the real differences between your declarative definitions and the production schema. This ensures that the generated migration scripts are precise and relevant.
2. **Manual Control**: You can review and modify the migration script before it’s applied. This is crucial because complex migrations often require nuanced adjustments that automated tools might miss.
3. **Safety First**: By adding the migration script to a PR as a file and applying it manually before or after merging, you maintain control over the process. This reduces the risk of automated CI tools wreaking havoc on your database with premature or incorrect migrations.
4. **Testing on Clones**: If needed, you can clone the production database and test the migration. This step is invaluable for ensuring that everything will run smoothly when you apply the changes to the live environment.
5. **Avoiding Pitfalls**: Forget “down” scripts and auto-apply in CI. These shortcuts can lead to disaster, especially in complex migrations that require careful orchestration, multi-step processes, and monitoring for locking issues.
6. **Skill Building**: Complex migrations necessitate hand-holding and a deep understanding of your database’s behavior. Embrace this as an opportunity to get good at managing intricate database changes. Your future self (and your database) will thank you.

In summary, a diff tool approach gives you the precision, control, and safety needed for effective SQL database migrations.
