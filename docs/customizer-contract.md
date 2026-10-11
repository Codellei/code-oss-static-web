# Archive customizer contract (planned CLI and GitHub Pages app)

**Status:** Technical implementation contract; **no archive customizer or public customizer UI is implemented yet**. [Read the end-user artifact guide first](artifact-customization.md).

## Purpose and non-goals

Produce an **unofficial, independently identifiable derivative** of an immutable COSW release archive using only static/browser-compatible configuration and extensions. The transformation engine MUST be the same logical implementation for a future CLI and a GitHub Pages UI; differing runtime-specific adapters for file access, download, archive I/O, and hashing are fine. It MUST NOT modify upstream compiled Code OSS files, mint official attestations, claim official support, inject credentials, or silently enable proposed APIs.

Initial distribution contract: **one currently published `company-standard` release archive**; `baseline-static` exists as a separate source-build profile. A future official Clean base would simplify distribution but is NOT a prerequisite for prototyping derivative customization. CLI and UI MUST read and display the actual base profile rather than assuming the downloaded archive is Clean.

## Archive member layout

Treat the archive extraction root as the **website root**. The published release `.tar.gz` is already flat, with members such as `index.html`, `static-bootstrap.mjs`, `runtime.json`, and `out/nls.messages.js`. It has no enclosing `dist/`, version directory, or explicit `./` root member. The extracted entry point must be `<destination>/index.html`, never `<destination>/dist/index.html`. Supported `.zip` inputs should normalize to the **same relative website paths**.

The latest `master` also uses flat paths for the **internal CI handoff `.tar` archives** (`static-dist.tar`, `release-static-dist.tar`, and `release-rebuild-static-dist.tar`). PR #113 removed only their explicit `./` root member; it did **not** change the already-flat published `.tar.gz`. Internal CI handoff tarballs can include directory entries; public packaging currently emits file entries directly. Validate against the actual supported input archive kind, not a rule that all archives must have identical directory headers.

Before any extraction, inspect each member: allow safe root-relative file paths and ordinary directory entries, reject links, absolute paths, `..` traversal, NULs, backslash/Windows path variants, and normalized-name collisions. For current public archives, reject `./` root entries and unexpected wrapping directories. If a previously published archive is explicitly supported with a different member spelling, the versioned compatibility descriptor MUST enumerate its normalization rules; never silently strip arbitrary parent directories or rewrite unrecognized members.

After customization, output must be **flat** too: the derived archive extracts directly to `index.html`, `static-bootstrap.mjs`, and `out/...` at the destination root. Check the archive's member listing and extract it into an empty temporary directory to verify the expected paths and unchanged compiled workbench bytes.

## Inputs

- An immutable `.tar.gz` or `.zip` release distribution chosen by the user; a matching trusted official checksum value, release tag, and source URL. The user may also select a local archive when browser CORS blocks download.
- A **versioned customization recipe** chosen by the user, never inferred from the contents of a third-party extension.
- Exact-version VSIX bytes and expected hashes for all bundled extensions, from explicitly approved origins or user-selected local files; no `latest` resolution or blind automatic dependency downloads.
- A COSW *base-version compatibility descriptor* maintained by the project, declaring supported input archive digests/build identities, safe bootstrap patch points, available proposed API names, and accepted output invariants. Unknown versions fail closed.

### Proposed JSON recipe v1

This is a **future format**, not an accepted input to the current repository scripts. All user-selectable fields are explicit; example uses a stable Remotish/GitHub setup. Opaque checksum values are omitted here and MUST be supplied/verified before export.

```json
{
  "schemaVersion": 1,
  "base": {
    "releaseTag": "v1.141.0-web.1",
    "profileId": "company-standard",
    "archiveSha256": "REQUIRED_OFFICIAL_64_HEX_DIGEST"
  },
  "features": {
    "gallery": "open-vsx",
    "defaultColorTheme": "Default Dark Modern"
  },
  "network": {
    "connectOrigins": ["https://api.github.com"]
  },
  "extensions": [
    {
      "id": "hrashton.remotish",
      "version": "PINNED_VERSION",
      "sha256": "REQUIRED_VSIX_SHA256",
      "source": "APPROVED_PINNED_SOURCE"
    },
    {
      "id": "hrashton.remotish-github-provider",
      "version": "PINNED_VERSION",
      "sha256": "REQUIRED_VSIX_SHA256",
      "source": "APPROVED_PINNED_SOURCE"
    }
  ],
  "proposedApiGrants": {}
}
```

Defaults: proposed API grants empty, extra origins empty, no bundled extensions, no implicit marketplace fallback. A preset (such as `demo`) is just a checked-in recipe plus pinned artifacts. Every selected extension's manifest, dependency list and browser entry point must be validated against the selected base.

### Advanced-history option

For an **explicit experimental** Remotish history-enabled host VSIX, replace the stable Remotish extension artifact in the recipe with a pinned history-capable VSIX **built for the selected Code OSS revision** and add:

```json
{
  "proposedApiGrants": {
    "hrashton.remotish": ["scmHistoryProvider", "timeline"]
  }
}
```

These are configuration **fragments**, not drop-in runnable scripts. This grant has a narrow effect: it authorizes these APIs for the exact extension ID. It does not add the `@remotish/vscode-history` implementation to the stable Open VSX VSIX. Before enabling, confirm the VSIX manifest declares the proposals and its bundle actually contains the history implementation; inspect `vscode.proposed.scmHistoryProvider.d.ts` and `vscode.proposed.timeline.d.ts` in the exact upstream Code OSS commit. Treat version mismatch as an error, not a warning. The controlled Remotish demo currently targets 1.139.1, whereas COSW pins 1.141.0.

**Never emit** `enabledExtensionProposedApi: []`. In the upstream embedder this means broad permission for *all* extensions, not an empty denylist. The intended grant is `productConfiguration.extensionEnabledApiProposals` keyed by extension ID. Preserve unrelated product settings and other security invariants. Do not let untrusted content enable proposals automatically.

## Deterministic transformation algorithm

Implement operations in this order and abort without an output file if any invariant fails:

1. **Acquire + verify source:** choose verified official archive bytes; validate checksum against the official release; check the supported **flat website-root archive layout** before extraction, then parse root-level `deployment-profile.json` and `runtime.json`; identify supported COSW/upstream version and base profile. Enforce configured compressed/uncompressed limits, file counts, path containment, duplicate normalized-entry rejection and no links.
2. **Resolve dependencies:** normalize extension IDs/origin URLs; validate feature dependencies (e.g., Remotish GitHub provider requires Remotish); prevent conflicting extension versions; verify approved source and license; refuse unknown proposal identifiers and unsupported option combinations.
3. **Verify VSIXs:** verify pinned SHA-256 *before extraction*, inspect archive members for traversal, zip bombs and symlinks, check `extension/package.json`, exact publisher/name/version, `browser` entry point, engine compatibility and declared dependencies. Run any additional admission/scan policy required for the deployment; do not claim malware scans occurred when they did not.
4. **Generate wrapper:** regenerate or structurally modify `static-bootstrap.mjs` (gallery configuration, `configurationDefaults`, scoped `productConfiguration.extensionEnabledApiProposals`), `index.html` (exactly scoped `connect-src`, and only required `img-src` changes), and `runtime.json` (effective metadata). Forbid wildcard origins, implicit `unsafe-eval`, loosened script restrictions, telemetry enablement and webview enablement. Unknown source anchors or generated file structures are errors; never do blind global substitutions.
5. **Install extensions:** place safe extracted VSIX contents at `extensions/<id>/`; regenerate `additional-extensions.json`, `locked-extensions.json`, and `extensions.json` using the conventions documented in `scripts/extension_lock.py` and `scripts/extensions_index.py`. Preserve all original built-in extensions, avoid duplicates and use correct relative URLs. Regenerate extension/license inventory information rather than inheriting unverified original claims.
6. **Identify the derivative:** preserve unmodified original `deployment-profile.json` as **base-build evidence**, add a *new* `customization-manifest.json` with schema, base release tag/hash/profile/config digest, fully normalized recipe, actual VSIX metadata, transformer version and changed-path SHA-256 list **excluding the manifest itself** (to avoid a self-hash cycle). The resulting archive's checksum belongs in a **separate** output `SHA256SUMS` alongside the archive (avoid a self-hash cycle). Mark derivative status clearly.
7. **Validate + package:** check all file relationships, CSP/origin coverage, bootstrap syntax, extension indexes, original Code OSS binary byte equality and expected policy invariants; build a **flat website-root archive** with stable file order/timestamps/modes and deterministic JSON serialization. Verify no `./` or `dist/` wrapper by listing members and extracting to an empty directory. Never overwrite the source archive. Export archive, manifest and new checksums.
8. **Qualify the actual output:** run the served result in Chromium and other target browsers/deployments: startup, editing, local folders where supported, gallery, extension activation, GitHub network requests, CSP/CORS/COEP, no unexpected network destinations, no telemetry, no webviews. For advanced Remotish, verify SCM history/Timeline integration and correct API denial for unlisted extensions. Without this step, present the output as **unqualified**.

### Per-file output requirements

| Path | New value/check |
| --- | --- |
| `index.html` | Single valid CSP with precise `connect-src`, optional gallery `img-src`, unchanged strict script policy and relative static paths |
| `static-bootstrap.mjs` | Valid JS; gallery wiring; defaults; `productConfiguration.extensionEnabledApiProposals` only when explicitly selected; keep telemetry false and invalid webview origin |
| `runtime.json` | Reflect effective gallery mode; telemetry false; webviews disabled |
| `deployment-profile.json` | Original source-build metadata **unchanged**; not an attestation of the derivative |
| `additional-extensions.json` | Every additional extension has unique ID and a path under `extensions/` |
| `locked-extensions.json` | Exact VSIX IDs, versions, hashes, licenses, and provenance of the selected additions; no fabricated approval |
| `extensions.json` | Deterministic index of installed manifests, including added web extensions |
| `extensions/<id>/` | Browser-safe exact VSIX contents |
| `out/**`, `out/nls.messages.js` | Byte-for-byte **unchanged** relative to source archive |
| `customization-manifest.json` | Base identity, effective recipe, derivative changes; distinguish from release `artifact-manifest.json` |
| External `SHA256SUMS` | SHA-256 of the **derived** archive (and optionally separate manifest file); never reuse official checksums |

## Worked output example: Remotish + public GitHub

This section defines the **effective output bytes/structures** the future transformer must produce. It is intentionally self-contained rather than a pointer to the current Python implementation. Paths are relative to the extracted static distribution root. Values named `PINNED_*` are placeholders and **must not be exported unverified**.

### `index.html`

Preserve the HTML document and its existing restrictive CSP directives. In a Ready-to-use base with the GitHub provider selected, the **relevant resulting directives** are:

```text
connect-src 'self' https://open-vsx.org https://openvsx.eclipsecontent.org https://api.github.com;
img-src 'self' https://open-vsx.org https://openvsx.eclipsecontent.org data: blob;
```

The full CSP must retain `default-src 'self'`, `script-src 'self' blob:`, `object-src 'none'` and all other restrictions from the selected verified base. Do not add `https://api.github.com` to `img-src` unless required by an actual selected feature. A stricter **HTTP CSP header** from the deployment edge can independently deny otherwise permitted requests; update/check it as well, rather than assuming the HTML meta policy always wins. For **no gallery**, preserve `img-src 'self' data: blob;` and `connect-src 'self'` before adding only separately selected origins.

### `runtime.json`

The effective Ready-to-use JSON remains:

```json
{
  "schemaVersion": 1,
  "productName": "Code OSS Static Web",
  "telemetry": false,
  "gallery": {"mode": "open-vsx"},
  "webviews": {"mode": "disabled"}
}
```

This is metadata, **not** the actual per-extension proposed-API grant location. If the selected gallery is disabled, set only `gallery.mode` to `disabled`, remove the gallery bootstrap configuration, and remove unneeded Open VSX origins from CSP.

### `static-bootstrap.mjs`

Keep the existing bootstrap's workspace restore, extension manifest fetch, `browserUri`, telemetry guard, relative import URLs, `globalThis._VSCODE_FILE_ROOT`, and `create(document.body, config)` call. Update **only the relevant fields** on the existing workbench `config` object, e.g.:

```js
configurationDefaults: {
  'workbench.startupEditor': 'none',
  'workbench.colorTheme': 'Default Dark Modern'
},
productConfiguration: {
  extensionsGallery: {
    serviceUrl: 'https://open-vsx.org/vscode/gallery',
    itemUrl: 'https://open-vsx.org/vscode/item',
    resourceUrlTemplate: 'https://open-vsx.org/vscode/unpkg/{publisher}/{name}/{version}/{path}',
    extensionUrlTemplate: 'https://open-vsx.org/vscode/gallery/{publisher}/{name}/latest'
  },
  extensionEnabledApiProposals: {
    'hrashton.remotish': ['scmHistoryProvider', 'timeline']
  },
  enableTelemetry: false,
  webEndpointUrlTemplate: 'https://{{uuid}}.invalid.invalid',
  webviewContentExternalBaseUrlTemplate:
    'https://{{uuid}}.invalid.invalid/out/vs/workbench/contrib/webview/browser/pre/',
  voiceWsUrl: ''
}
```

**This is a fragment of the existing workbench options, not a second `config` object.** Omit `extensionEnabledApiProposals` when no reviewed experimental proposal grants are selected. When only stable Remotish is installed, this field MUST be absent or empty. Never emit `enabledExtensionProposedApi: []`. Gallery must be omitted when disabled. Preserve any existing base-specific valid webview URL template (fail-closed to `invalid.invalid`).

### Extension trees and indexes

After verifying/decompressing VSIXs into `extensions/hrashton.remotish/` and `extensions/hrashton.remotish-github-provider/`, the additional-extension bootstrap index MUST be:

```json
{
  "schemaVersion": 1,
  "extensions": [
    {"id": "hrashton.remotish", "path": "extensions/hrashton.remotish/"},
    {"id": "hrashton.remotish-github-provider", "path": "extensions/hrashton.remotish-github-provider/"}
  ]
}
```

Sort entries deterministically by extension ID. Merge, do not discard, pre-existing additional extensions. `locked-extensions.json` has `schemaVersion: 1` and an `extensions` array: each installed entry records `id`, `version`, `sha256`, `license`, `source` and any **real** approval metadata. Do not manufacture approval records. `extensions.json` has `schemaVersion: 1` and includes a deterministic entry for each extension directory's manifest with `id`, `version`, `path`, `browserCompatible`, and `license`, preserving pre-existing entries. Extension IDs must be canonical `publisher.name`, not inferred from ZIP file names.

For the experimental proposed-API option, the Remotish extension directory above must contain a specially built history-capable `hrashton.remotish` VSIX, not the public stable artifact. That VSIX's `package.json` must contain `enabledApiProposals: ["scmHistoryProvider", "timeline"]`, and the packaged browser JS must implement the optional history integration. A grant and manifest declaration alone are **not** sufficient.

### Identity output

Add a **new** `customization-manifest.json` (proposed schema v1) inside the derivative archive:

```json
{
  "schemaVersion": 1,
  "kind": "unofficial-cosw-derivative",
  "base": {
    "releaseTag": "v1.141.0-web.1",
    "profileId": "company-standard",
    "archiveSha256": "VERIFIED_64_HEX_DIGEST",
    "profileConfigSha256": "COPIED_FROM_ORIGINAL_DEPLOYMENT_PROFILE"
  },
  "transformerVersion": "PINNED_TRANSFORMER_VERSION",
  "recipe": "NORMALIZED_RECIPE_OBJECT_IN_REAL_OUTPUT",
  "extensions": "VERIFIED_EXTENSION_RECORDS_IN_REAL_OUTPUT",
  "changedPaths": "SORTED_PATH_AND_SHA256_RECORDS_IN_REAL_OUTPUT",
  "qualification": "unqualified"
}
```

The string placeholders above indicate types/values for a **design example**, not a final manifest schema instance: `recipe` must be a JSON object, `extensions` and `changedPaths` arrays, and `qualification` an explicit statement that the user's downloaded derivative was not CI/browser-qualified. Avoid falsely carrying over the source release SBOM or signature as coverage of the derivative. Exclude `customization-manifest.json` from its own `changedPaths` hash list to avoid a self-reference; hash that manifest and the archive independently in the *separately downloaded* `SHA256SUMS`.

### Testing this example

An acceptance test must open a public repository using the compatible Remotish GitHub provider and observe network requests only to the selected approved origins. In stable mode, verify basic virtual workspace and SCM functions. In **experimental history** mode, additionally verify actual history and Timeline items; selecting that feature without a history-enabled VSIX must produce a clear error **before** export. Record exact browser, host, extension versions and evidence. Authentication and remote publication are **not** part of this public GitHub preset.

## Browser-only GitHub Pages implementation

1. UI presents source version/profile and switches for Open VSX, Dark theme, Remotish GitHub, experimental Remotish advanced history, and controlled additional HTTPS origins. Default to least privilege; proposal access is an explicit opt-in with an instability warning.
2. Display a **network and API-permission preview** before running, including exact extension IDs, proposal names, origins and extension licenses. This is a transparency view, not a promise of extension security.
3. Download verified official bytes via `fetch` only when browser cross-origin policies allow it. Fall back to a **local file picker** (or a project-operated, same-origin immutable mirror) instead of trying to bypass CORS. Same rule for exact VSIX downloads.
4. Use streaming/bounded decompression and integrity checking in the browser; handle memory/CPU limits, cancel/retry, and provide explicit errors for archives too large for the device. Client-only processing means files/credentials do not need to be uploaded to COSW servers.
5. Generate output files locally, show changed paths and checksums, and allow archive + recipe + derivative manifest + checksum export. Re-running with the same supported inputs should produce byte-identical outputs. Never claim an official signature on the derivative.
6. For the project-controlled hosted demo, use the *same recipe engine* in CI, verify reproducibility, run the actual browser qualification, then publish a specifically tested artifact to Pages. Do not modify Pages or an attested artifact after qualification.

## Safety and compatibility gates

- Treat the base archive and VSIXs as untrusted bytes until independently verified; a VSIX may execute JavaScript when the resulting editor is opened.
- No blanket extension-proposed-API enablement. A nonempty grant requires explicit consent and the exact proposed declaration set; project-controlled distributions additionally require reviewed approval/expiry records.
- Disallow `http:` origins, wildcard `connect-src`, unknown origins injected by extensions, credential-bearing URLs, and changes to built-in compiled files. The UI should not silently add `https://api.github.com` merely because an extension *might* use it; preview the dependency-driven permission.
- Do not treat CSP as authentication or as an extension sandbox. External CORS and COEP headers can still block otherwise allowlisted requests; disclose data movement through third-party gallery/API origins.
- Respect the official upstream MIT/third-party notices and extension licenses. A customization can require a refreshed SBOM/license inventory before organizational distribution.
- Make no guarantee about extension compatibility based purely on marketplace availability. Proposed APIs are unstable and can change across upstream revisions.

## Acceptance tests for an implementation

- [ ] Original archive hash mismatch, unsupported base/unknown patch point, malformed archive, traversal, duplicate normalized path, unexpected archive root, or decompression limit: **fail closed**.
- [ ] Clean/ready metadata displayed accurately; unmodified recipe produces a byte-equivalent tree (apart from an independently identified optional customization manifest).
- [ ] Open VSX only rewrites the correct gallery/CSP/runtime triplet; no unexpected network origin is admitted.
- [ ] GitHub provider automatically requires a compatible Remotish host; CSP includes `https://api.github.com` only if selected.
- [ ] Stable Remotish works with **no** proposed API grants; historical integration cannot be selected with the stable-only host artifact.
- [ ] Experimental history uses exact extension ID grants for `scmHistoryProvider` and `timeline`, and actually exercises history/Timeline; proposal APIs remain unavailable to unrelated extensions.
- [ ] Added VSIX versions/hash/license/entry point/dependencies/paths verified; original compiled workbench files unchanged.
- [ ] The derived archive has flat root-relative members (no `./` or enclosing `dist/`), and extraction into an empty directory yields `index.html` at that directory's root.
- [ ] Same input bytes + exact recipe + transformer version produce byte-identical outputs in CLI and browser (or a clearly documented equivalent tree + metadata digest when archive formats differ).
- [ ] A new derivative checksum/manifest is emitted and cannot be misread as the official attestation or SBOM.
- [ ] CI-hosted demo publishes only the actually qualified recipe output, not an untested archive modification.

## Reference source files

- [Static wrapper generator](../scripts/make_static.py) - authoritative `index.html`, `static-bootstrap.mjs`, runtime and extension index generation.
- [VSIX handling](../scripts/extension_lock.py) and [extension index](../scripts/extensions_index.py) - current safety and manifest conventions.
- [Deployment profile](../scripts/deployment_profile.py) and [configuration validation](../scripts/validate_config.py) - current build-time restrictions and digest semantics.
- [Current proposed-API policy](../config/policies/proposed-api/none.json) and [upstream product transform](../scripts/prepare_upstream.py) - source-build path; a distinct derivative-grant path is *proposed* above.
- [Browser testing](testing.md), [compatibility](../COMPATIBILITY.md) and [release security](release-security.md).
- [Remotish Code OSS integration](https://github.com/Codellei/remotish/blob/master/docs/code-oss-integration.md) and [Remotish GitHub provider](https://github.com/Codellei/remotish/blob/master/extensions/github-provider/README.md).

