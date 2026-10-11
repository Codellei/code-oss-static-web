# Code OSS Static Web

[![CI](https://github.com/Codellei/code-oss-static-web/actions/workflows/ci.yml/badge.svg)](https://github.com/Codellei/code-oss-static-web/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**A self-hosted Code OSS editor for your browser. No application backend required.**

Run a familiar code editor from static files, on your own host, or with Docker.

## Choose your version

### Clean: Start with the essentials

Code OSS with the compatibility patches needed to run as a static website.

- No extension marketplace or bundled third-party extensions.
- Self-only network policy; host telemetry and webviews disabled.
- A minimal base for custom browser-editor deployments.

**[Build Clean from source](docs/clean.md)**

### Ready-to-use: Open and start editing

The same Code OSS foundation, preconfigured with the **Open VSX** extension gallery.

- Browse and install compatible browser extensions (not every extension works).
- Open local folders in supported Chromium browsers.
- Deploy the published static archive or Docker image.

**[Download Ready-to-use](https://github.com/Codellei/code-oss-static-web/releases/latest)** · **[Find the GitHub Pages demo](https://github.com/Codellei/code-oss-static-web/deployments/github-pages)**

> **Current availability:** Releases, the Docker image, and GitHub Pages promotion use the Ready-to-use (`company-standard`) profile. Clean (`baseline-static`) is buildable from source but is **not yet a separately published release**. The Pages demo is the Ready-to-use build, not Clean.

## Build profiles

Source builds select a profile through `config/deployment.json`:

| Profile | Proposed API grants | Default network and gallery |
| --- | --- | --- |
| `baseline-static` | None | Self-only; no extension gallery |
| `company-standard` | None | Self and approved Open VSX origins; Open VSX gallery |

Both official profiles disable proposed-API grants. Experimental per-extension grants apply only to separately customized derivatives or reviewed source-build profiles, not the official release.
## Customize an archive

A release archive is a static website. You can make a **new, unofficial derivative** by adjusting the gallery, CSP origins, default theme, and bundled browser extensions without necessarily recompiling Code OSS. Scoped **proposed-API grants** (for a compatible experimental Remotish history host) are possible too; the published Remotish extension itself uses stable APIs only.

Read [the artifact file guide](docs/artifact-customization.md) to see what every key file does and what can safely change. The [customizer contract](docs/customizer-contract.md) specifies a future browser-based GitHub Pages configurator and CLI. **Neither tool is implemented yet.**

## Run Ready-to-use locally

Use a tag from [Releases](https://github.com/Codellei/code-oss-static-web/releases/latest). For example:

```sh
docker run --rm -p 127.0.0.1:8080:8080 ghcr.io/codellei/code-oss-static-web:v1.141.0-web.1
```

Open **http://127.0.0.1:8080/**. To use static hosting instead, download the release archive and serve the extracted files; see the [deployment guide](docs/ready-to-use.md). The release archive is flat: extraction produces `index.html` directly in the chosen directory, not inside a `dist/` subfolder.

## What works?

- **Editing:** Code OSS editor, commands, settings, and browser-compatible language features.
- **Local folders:** In Chrome or Edge on a secure origin, use **File: Open Folder...** and grant browser access. Files stay on your computer; permissions are browser-managed.
- **Extensions:** Ready-to-use connects to Open VSX. No extra third-party extensions are bundled by default; gallery availability does not guarantee compatibility.
- **Self-hosting:** Publish the static files or run the Nginx-based container; no Code OSS server is needed.

## Important limits

- No integrated terminal or local Git commands.
- No offline mode; webviews are disabled.
- Local folder access requires a browser with File System Access support.
- Host telemetry is disabled, but third-party extensions can make their own network requests.

Read [Compatibility](COMPATIBILITY.md) for supported browser/deployment boundaries.

## Documentation

- [Clean build](docs/clean.md) · [Ready-to-use deployment](docs/ready-to-use.md) · [Customize an archive](docs/artifact-customization.md)
- [Contributing](CONTRIBUTING.md) · [Testing](docs/testing.md) · [Release security](docs/release-security.md)
- [Support](SUPPORT.md) · [Report an issue](https://github.com/Codellei/code-oss-static-web/issues) · [Security reports](SECURITY.md)

## Upstream and license

This project builds from pinned upstream Code - OSS, without maintaining a Microsoft repository fork. It is not Microsoft's Visual Studio Code distribution and is not endorsed by Microsoft.

Original project tooling is [MIT licensed](LICENSE). Code OSS and third-party components retain their respective licenses; release artifacts include licenses, notices, and an SBOM.
