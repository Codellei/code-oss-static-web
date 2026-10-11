# Clean build (`baseline-static`)

**Clean** is the minimal Code OSS Static Web variant: pinned upstream Code - OSS plus the patches and static bootstrap needed to run in a browser. It is not an unmodified upstream build.

Unlike [Ready-to-use](ready-to-use.md), Clean has **no Open VSX gallery**. Both use the same locked upstream revision and keep the project's host telemetry and webviews disabled.

## What's included?

- Code OSS's browser editor and compatible built-in extensions.
- The project's required upstream compatibility patches and static-hosting bootstrap.
- A self-only runtime network policy and no extra third-party extensions by default.

Clean does **not** add a terminal, local Git commands, secure webviews, or offline support. Local folder editing still depends on a compatible browser and secure origin. See [Compatibility](../COMPATIBILITY.md).

## Build Clean

**Clean is currently a build profile, not a separately published GitHub Release or Docker tag.** The current published archive and image are Ready-to-use (`company-standard`). Do not download those expecting the Clean network/gallery policy.

From a repository checkout, select the existing `baseline-static` profile:

```sh
python3 - <<'PY'
import json
from pathlib import Path

path = Path('config/deployment.json')
config = json.loads(path.read_text(encoding='utf-8'))
config['profile'] = 'baseline-static'
path.write_text(json.dumps(config, indent=2) + '\n', encoding='utf-8')
PY

./build.sh
python3 scripts/smoke_static.py dist
python3 scripts/serve_static.py --directory dist --base-path /code-oss-web/ --port 8080
```

Open `http://127.0.0.1:8080/code-oss-web/` to inspect the generated distribution.

The `dist/` directory contains static files; a browser can load them from a compatible static server with the required headers. For production deployment, run the full browser qualification described in [Testing](testing.md) and check the [static hosting contract](../COMPATIBILITY.md#static-hosting-and-csp).

To package the same `dist/` after qualification, use `./package.sh` (which requires the project's locked packaging dependencies, including Syft). The generated public-style `.tar.gz` is **flat**: extracting into `site/` yields `site/index.html`, not `site/dist/index.html`. Local packaging is **not** a signed or qualified official Clean release.

After building, testing, and any packaging, restore the repository's default Ready-to-use selection if needed:

```sh
git restore config/deployment.json
```

## Why two variants?

| | Clean | Ready-to-use |
| --- | --- | --- |
| Build profile | `baseline-static` | `company-standard` |
| Open VSX gallery | Disabled | Enabled |
| Allowed runtime network origins | Self only | Self + reviewed Open VSX origins |
| Bundled third-party extensions | None by default | None by default |
| Publicly published now | No (build from source) | Yes (Release, Docker, Pages) |

These are **build-time** profiles: changing a Docker environment variable or editing a released archive does not switch variants or preserve the release's attestation.


You can also customize an existing **Ready-to-use** release as an unofficial derivative without recompiling Code OSS; this does **not** turn it into the official `baseline-static` Clean profile. See the [artifact file guide](artifact-customization.md).
