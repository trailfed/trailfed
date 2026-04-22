# CLAUDE.md — TrailFed

Project-level behavioural guidelines for AI assistants working in this repo.

The four principles below are adapted from [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) (Karpathy-inspired guidelines to reduce common LLM coding mistakes). They apply on top of any user/global instructions.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## Git & GitHub workflow

**Правило коммитов: до — после — после теста.**

### Перед любыми изменениями
1. `git status` — убедиться, что рабочая копия чистая. Если есть незакоммиченные изменения — сначала закоммитить или стешить, не смешивать с новой работой.
2. Создать ветку: `git checkout -b <type>/<short-desc>` (типы: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`).
3. Сделать baseline-коммит если нужно зафиксировать текущее состояние перед правками.

### Во время работы
- **Маленькие коммиты, по одной логической единице.** Каждый коммит должен быть самодостаточным и проходить тесты.
- Commit message в imperative mood, Conventional Commits:
  - `feat: add webfinger responder stub`
  - `fix(federation): handle missing actor field`
  - Первая строка ≤ 72 символов, детали — в теле.
- DCO sign-off обязательно: `git commit -s` (см. [CONTRIBUTING.md](CONTRIBUTING.md)).

### После изменений (обязательный цикл)
1. Запустить тесты/линтеры/билд (см. [package.json](package.json) scripts).
2. Если тесты падают — **не коммитить поверх**, а чинить в отдельных фиксап-коммитах или `git commit --amend` пока ветка локальная.
3. Когда тесты зелёные — финальный коммит, push, PR.

### Pull Requests
- PR создаётся через `gh pr create`, никогда push напрямую в `main`.
- Описание PR включает: Summary (1–3 bullets), Test plan (checklist), ссылки на ADR/issue если есть.
- Анализировать **всю** историю коммитов ветки для описания, не только последний.
- Требуется минимум одно человеческое ревью перед merge.

### Что НЕ делать
- Не использовать `--no-verify` / `--no-gpg-sign` без явного разрешения.
- Не делать `push --force` в `main`/защищённые ветки.
- Не амендить опубликованные коммиты.
- Не коммитить `.env`, ключи, большие бинарники.
- Не смешивать рефакторинг с фикс-коммитами (принцип Surgical Changes из секции выше).

## TrailFed-specific notes

- Phase 0 scaffold only — see [docs/roadmap.md](docs/roadmap.md) before adding features outside the current phase.
- Governance: ADRs in [docs/adr/](docs/adr/) — material architectural changes require an ADR.
- Contribution flow uses DCO sign-off (see [CONTRIBUTING.md](CONTRIBUTING.md)).
- License is AGPL-3.0-or-later; don't introduce dependencies with incompatible licenses.

## Отслеживание прогресса — обязательное правило

В репозитории три канонических источника правды. Не создавать параллельные списки.

- **[`NEXT_STEPS.md`](NEXT_STEPS.md)** — единственный источник «что дальше». Список задач по фазам, чекбоксы `- [ ]`. Порядок = приоритет.
- **[`CHANGELOG.md`](CHANGELOG.md)** — единственный источник «что сделано». Формат [Keep a Changelog 1.1](https://keepachangelog.com/en/1.1.0/). Сверху всегда секция `## [Unreleased]`.
- **GitHub Releases** — генерируются из `CHANGELOG.md` при теге. Вручную не писать.

### Перед завершением любой задачи агент ОБЯЗАН:

1. **Отметить выполненный пункт** в `NEXT_STEPS.md`: `- [ ]` → `- [x]`. Если задачи там не было — добавить её задним числом в нужную фазу и сразу отметить сделанной (для истории).
2. **Добавить запись** в `CHANGELOG.md` в секцию `## [Unreleased]`, в подсекцию `Added` / `Changed` / `Fixed` / `Removed` / `Security` / `Deprecated`. Одна строка, пользовательский язык, без внутреннего жаргона.
3. **Не трогать** `docs/roadmap.md` ради статуса задач — это нарративный документ по фазам; оперативные задачи живут только в `NEXT_STEPS.md`.

### Что НЕ писать в CHANGELOG.md

Правки опечаток, бампы dev-зависимостей, внутренние CI-твики, рефакторинг без пользовательского эффекта. Для них достаточно commit-сообщения.

### Релиз (когда накопится осмысленный набор изменений)

Переименовать `## [Unreleased]` → `## [0.x.0] — YYYY-MM-DD`, создать пустую `## [Unreleased]` сверху, поставить git-тег `v0.x.0`, `gh release create` подтянет описание из CHANGELOG.

### Источник паттерна

Mastodon (CHANGELOG.md в Keep-a-Changelog + GitHub Releases) + Element/Matrix (публичный список "что дальше"). Детали: https://keepachangelog.com/en/1.1.0/
