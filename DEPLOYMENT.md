# MusicCoach hosting

The main browser app, device simulator and USB installer run together from one
Node server. PostgreSQL stores accounts, imports, progress and community data.
Caddy supplies HTTPS. Deployment uses Docker Compose on a t3.small EC2 instance
in us-east-1, alongside the owner's existing AWS workloads.

## Local development

Install Node 22+, run `npm ci`, copy `.env.example` to `.env`, and configure a
PostgreSQL database. Run `node --env-file=.env db/seed.mjs`,
`node scripts/build-public.mjs`, then `npm start`.
Rebuild public assets after frontend edits. Only `public/` is served.

## Production

Create an untracked `.env` beside compose.yaml with `DB_PASSWORD` (random hex),
`SETUP_TOKEN` (random owner setup code), and `SITE_HOST` (DNS hostname).
Run `docker compose up -d --build`. Only Caddy publishes ports; the app and
database remain on the internal Docker network. The public origin must match
the browser's origin, and account cookies are Secure under HTTPS.

The first registration needs the owner setup code and becomes Super Admin.
Subsequent users register as learners without the code. The owner can configure
the AI coach key from account settings. It persists in the private settings
volume. Secrets and local user data are excluded from this repository.

Volumes preserve database, AI settings and TLS certificates across deployments.
Do not use `docker compose down -v` unless deliberately deleting all site data.
Back up with `docker compose exec -T db pg_dump -U musiccoach musiccoach` into
private storage. A database backup is needed before schema changes.

AWS administration uses SSM; SSH is not exposed. The instance has encrypted
30 GiB EBS, a reserved IPv4 address, and a role limited to SSM plus reading its
private deployment bucket. T3 uses standard CPU credits to avoid surplus charges.
The GitHub Pages branch redirects visitors to the AWS app.

## Device build provenance

Device assets were imported from the owner's MusicCoach firmware worktree,
based on Felucca 1.5.1 `a4d7ca2e5d52a4c35e2468401f00d883cadbda03` and the SMK
foundation `cc13e146f11d93328b4fc13ec92c4d69f6bc6e76`. Credits and license texts
are retained under `device/musiccoach-firmware/`; corresponding source archives
are downloadable beside each candidate. Dual-core adaptations credit Melodee
and Sloop. This is a source import, not an upstream merge or clean-room rewrite.

Publishing the site does not promote firmware candidates or flash any device.
FM-1 0.2 has owner-confirmed screen and key sound after USB installation; other
controls still need hardware validation. FM-1 0.3 dual-core and SMK candidates
remain explicitly labeled tests. Simulator tests do not establish hardware safety.

## Validation

`npm test`, `node --test hosting.test.mjs`, and the isolated-schema
`accounts.integration.test.mjs` cover app behavior and account/community ownership.
The three `device/audio/test_musiccoach*.mjs` scripts exercise native WASM audio,
controls and visuals; `device/musiccoach-usb/restore-stock/test_detect.mjs` checks
read-only device detection. Hardware firmware was not changed for this deployment.
