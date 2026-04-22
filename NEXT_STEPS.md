# Next Steps — actions that need the project owner

Everything the agent could do locally is in the repo. This file lists the **external actions** that require your credentials or manual work before the project is fully bootstrapped.

## 1. Domain registration (~$40–60 / year)

Register at least `trailfed.org` (primary). Recommended defensive additions: `trailfed.com`, `trailfed.dev`.

Suggested registrars:
- **Porkbun** — good WHOIS privacy, clean UX.
- **Namecheap** — reliable, supports 2FA.

Update DNS later when the first public instance goes live.

## 2. GitHub org & repo

1. Create org `trailfed` at https://github.com/organizations/new — free tier is fine.
2. Create repo `trailfed/trailfed`, public, **without** initial README/LICENSE/gitignore (we already have them).
3. Push this local repo:
   ```bash
   cd /home/vanlife/trailfed
   git add -A
   git commit -s -m "feat: Phase 0 scaffold — governance, ADRs, docker-compose"
   git remote add origin git@github.com:trailfed/trailfed.git
   git branch -M main
   git push -u origin main
   ```
4. Settings → Branches → protect `main` (require PR + 1 review + status checks: CI, DCO).
5. Settings → Security → enable "Private vulnerability reporting".
6. Settings → Actions → allow GitHub Actions + "Read and write permissions" for the release pipeline.
7. Add labels via `gh label create`:
   ```bash
   gh label create good-first-issue --color '7057ff' --description 'Good for newcomers'
   gh label create help-wanted       --color '008672' --description 'Extra attention needed'
   gh label create phase-0           --color 'cccccc'
   gh label create federation        --color '1d76db'
   gh label create osm               --color '5319e7'
   gh label create security          --color 'b60205'
   ```

## 3. Social identities (reserve the name before squatters)

- Mastodon: register `@trailfed@fosstodon.org` (or another server). Bio links to repo.
- Bluesky: register `trailfed.bsky.social` (and later set up DID/custom domain on `trailfed.org`).
- Matrix: create room `#trailfed:matrix.org` for community chat.
- X/Twitter: register `@trailfed_org` (the plain `@trailfed` is free but account creation needs the web UI).

## 4. Email addresses

Minimum at the registered domain:
- `conduct@trailfed.org` — CoC reports (referenced in `CODE_OF_CONDUCT.md`)
- `security@trailfed.org` — vulnerability reports (referenced in `SECURITY.md`)

Forwarders to a maintainer's personal mailbox are fine in Phase 0.

## 5. First deploy verification

Once repo is on GitHub and CI green:

```bash
# On a clean machine:
git clone https://github.com/trailfed/trailfed.git
cd trailfed
cp .env.example .env
docker compose up --build
# Open http://localhost:8090 → SvelteKit + MapLibre should render.
# curl http://localhost:8090/.well-known/webfinger?resource=acct:test@localhost → 200 JSON stub.
# curl http://localhost:8090/nodeinfo/2.0 → 200 JSON with software.name=trailfed.
```

## 6. Announce (optional, only after CI is green)

- Fediverse post from `@trailfed@fosstodon.org`: "Phase 0 scaffold is public. Looking for contributors, especially anyone who enjoys Fedify, MapLibre or OSM imports."
- r/selfhosted, r/fediverse — short post linking to repo.
- NLnet NGI0 grant enquiry — https://nlnet.nl/propose/

## Tracking

Open a tracking issue in the new repo labelled `phase-0` with the above checklist. Close it when all items are done — that marks the end of Phase 0.
