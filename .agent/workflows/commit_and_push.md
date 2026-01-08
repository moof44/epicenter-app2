---
description: Commit all changes and push to the current branch
---

1. Check the status of the repository
   - Run `git status` to see what has changed.

2. Stage all changes
   - Run `git add .`

3. Commit the changes
   - Ask the user for a commit message or use a descriptive one based on the changes.
   - Run `git commit -m "<message>"`

4. Push to remote
   - Run `git push`
   - If the upstream is not set, run `git push --set-upstream origin <branch_name>`
