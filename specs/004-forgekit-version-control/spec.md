# ForgeKit Trunk-Based Development (GitHub Flow) & Version Control Standard

## 1. Overview
This document defines the standard version control workflow for the ForgeKit project. To ensure agility, continuous integration, and seamless integration with our Spec-Driven Development (SDD) toolkit and Artificial Intelligence Agents, we adopt the **Trunk-Based Development (GitHub Flow)** model.

Both Human Developers and Artificial Intelligence Agents must adhere to these guidelines to ensure rapid iterations, avoid heavy merge conflicts in our monorepo architecture, and maintain a clean history.

## 2. Branching Strategy (Trunk-Based)

The repository relies on a single source of truth branch and short-lived ephemeral branches for specific tasks.

### 2.1. The Single Main Branch: `master`
* Represents the absolute standard and deployable state of the project.
* **Never push directly to `master`**. All changes must go through a Pull Request.
* Automation, comprehensive testing, and Continuous Integration (CI) run against this branch.
* Production releases are simply Git Tags (e.g., `v1.2.0`) created on the timeline of the `master` branch.

### 2.2. Short-Lived Feature Branches
Whenever you want to add a feature, fix a bug, or perform a refactor, you branch off `master`. These branches should be kept small, highly focused, and merged back as soon as the specific task is complete.

#### **Branch Naming Conventions**
Always branch directly from `master`.
* **Features**: `feat/<brief-description>` (e.g., `feat/auth-gateway`)
* **Bug Fixes**: `fix/<brief-description>` (e.g., `fix/user-token-leak`)
* **Chore/Maintenance**: `chore/<brief-description>` (e.g., `chore/update-configs`)
* **Refactoring**: `refactor/<brief-description>` (e.g., `refactor/clean-routes`)

---

## 3. Commit Guidelines (Conventional Commits)
All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) standard. This allows for automated changelog generation and easier chronological navigation.

**Format:**
```
<type>(<optional scope>): <description>

[optional body]
[optional footer(s)]
```

**Common Types:**
* `feat`: A new feature
* `fix`: A bug fix
* `docs`: Documentation only changes
* `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
* `refactor`: A code change that neither fixes a bug nor adds a feature
* `perf`: A code change that improves performance
* `test`: Adding missing tests or correcting existing tests
* `chore`: Changes to the build process or auxiliary tools and libraries

**Rules:**
1. Entire commit message must be written in **English**.
2. Keep the subject line concise (under 50 characters).
3. Use the imperative mood in the subject line (e.g., "feat: add feature" not "feat: added feature").

---

## 4. Instructions for AI & Developers

When starting a new task via `speckit` or manually, follow this rapid cycle:

1. **Synchronize**: Ensure you are on `master` and it is up to date (`git checkout master && git pull origin master`).
2. **Branch Creation**: Create a focused branch for the task (`git checkout -b feat/my-new-task`).
3. **Commit Incrementally**: Make atomic, focused commits following Conventional Commits.
4. **Pull Request**: Push the branch and immediately open a Pull Request against `master`.
5. **Review & Tests**: The PR is reviewed safely via automated CI tests or human peer-review. 
6. **Merge to Trunk**: Once approved, merge it into `master` (Wait for CI to pass). PRs shouldn't sit idle for long.
7. **Cleanup**: Delete the branch immediately upon a successful merge to keep the repository unpolluted.

---

## 5. SpecKit Automation Integration

To enforce this workflow automatically using the **GitHub Spec Kit**, the project's orchestration file (`.specify/workflows/speckit/workflow.yml`) should integrate specific `shell` hooks that force the AI and developer to branch before planning, and commit after implementing.

**Recommended Workflow configuration:**
```yaml
inputs:
  feature_name:
    type: string
    required: true
    prompt: "Feature name (Used for branch generation, e.g., login-system)"
# ...
steps:
  # 1. Automate Branching (Before Spec Generation)
  - id: git-setup
    type: shell 
    command: |
      git checkout master
      git pull origin master
      git checkout -b feat/{{ inputs.feature_name }}
  
  # ... (Standard Speckit specification and implementation steps) ...

  # 2. Automate Commits (After Implementation)
  - id: review-implementation
    type: gate
    message: "Code implementation delivered. Prepare Github Flow commits?"
    options: [approve, reject]

  - id: git-commit-stage
    type: shell
    command: |
      git add .
      git commit -m "feat: implement {{ inputs.feature_name }}"
      git push -u origin feat/{{ inputs.feature_name }}
```
This guarantees that any feature managed by an AI cleanly avoids interfering with the `master` branch while minimizing friction.
