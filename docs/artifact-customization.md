# Customize a release archive

Code OSS Static Web (COSW) is a static website, not a server process. You can create your own editor by unpacking a released archive, changing its configuration/assets, and packaging the **result as a new artifact**. A full Code OSS rebuild is not intrinsically required for gallery settings, network origins, default theme, packaged browser extensions, or narrowly granted proposed APIs.

> **Status:** This is a guide to the artifact and a design for a future CLI/browser customizer. The repository does **not yet provide** an archive-patching CLI or GitHub Pages configurator. The current official release uses the `company-standard` (Open VSX) profile; `baseline-static` (Clean) is presently built from source, not a separately downloadable release. See [Clean](clean.md) and [Ready-to-use](ready-to-use.md).

## Archive layout

The **published release `.tar.gz` is already flat**: it stores files relative to the website root, not beneath a `dist/` or versioned enclosing directory, and contains no standalone `./` root entry. For example, after extraction into `site/`:

```text
site/
  index.html
  static-bootstrap.mjs
  runtime.json
  deployment-profile.json
  additional-extensions.json
  out/
    nls.messages.js
    vs/
      workbench/
  extensions/
```

Some directories may be empty or absent depending on the selected extension set. The paths in the file table below are **relative to this website root**. Running `tar -xzf <archive>.tar.gz -C site` should place the entry point at `site/index.html`, not `site/dist/index.html`.

PR #113 changed **internal CI handoff tarballs** to omit the explicit `./` root member. This does **not** change the public release archive, which was already flat. Internal CI tarballs can contain directory headers, but when unpacked into `dist/` their website files still appear at `dist/index.html`, `dist/static-bootstrap.mjs` and so on.

A customizer must inspect and validate each archive member *before* extracting it. Reject absolute paths, parent traversal, conflicting/duplicate normalized names, links and unsupported enclosing-directory layouts. Do not simply strip arbitrary leading path components, since that can hide malicious or incorrect members. For explicitly supported older formats, the base-version compatibility descriptor must define any allowed normalization.

## Start with an official artifact

1. Open [Releases](https://github.com/Codellei/code-oss-static-web/releases/latest) and download the `.tar.gz` (or `.zip`) distribution and its matching `SHA256SUMS`.
2. Verify the **original archive's** SHA-256 against the official checksums before extracting or transforming it. The checksum proves byte equality to the release's checksum record, not the trustworthiness of added extensions.
3. Unpack into a separate directory, preserving file paths and executable modes when relevant.
4. Make only the changes described below. Test the generated website on a compatible static host.
5. Export a **new** archive with a new checksum and a customization manifest. Keep the original archive untouched.

The current official release's attestations, SBOM, and checksum do **not** attest to your modified files. A customized site also needs its own extension/license inventory and independently qualified deployment if support or provenance is claimed.

## Key files inside the static distribution

| Path in the archive | Purpose | Customization guidance |
| --- | --- | --- |
| `index.html` | HTML entry point, title, script/style URLs, **meta Content Security Policy (CSP)** | Regenerate CSP for permitted network origins; preserve bootstrap and relative paths |
| `static-bootstrap.mjs` | Configures the Code OSS browser workbench **before** it starts: gallery, workspace handling, user defaults, product overrides, extra extension locations | Primary place for gallery, theme defaults, and **proposed-API grants**; generate using a structured patch, not an arbitrary search-and-replace |
| `runtime.json` | COSW runtime metadata: product name, telemetry-disabled guarantee, gallery and webview modes | Keep consistent with effective bootstrap configuration; changing this file **alone** does not enable a gallery or proposed APIs |
| `deployment-profile.json` | Build-time profile ID, config digest, input hashes from the original distribution | Preserve the original file as base-build evidence; do **not** rewrite it to pretend the official release used a new profile |
| `additional-extensions.json` | Lists extra extensions the bootstrap loads, with archive-relative paths | Update when bundling extensions; keep IDs/paths unique and within the distribution |
| `locked-extensions.json` | Records version, SHA-256, license, and source for approved bundled extensions | Keep in sync with all added bundled extensions; verify each VSIX before unpacking |
| `extensions.json` | Index generated from installed extension manifests | Regenerate after changing `extensions/`; do not confuse with the additional-extension bootstrap list |
| `extensions/<publisher.name>/` | Unpacked browser extension files, including `package.json` and its `browser` entry point | Add only validated, compatible VSIX contents with safe relative paths |
| `out/vs/workbench/` and `out/nls.messages.js` | Compiled Code OSS workbench JavaScript, CSS, localization | **Do not modify** for the supported configuration-only customization path; changes here may require a source rebuild |
| `LICENSE.Code-OSS.txt`, `ThirdPartyNotices.Code-OSS.txt` | Upstream licensing and notices | Retain; add notices/licenses needed by bundled extensions |
| `manifest.json`, `favicon.ico`, `callback.html` | Browser app metadata, icons, callback page | Branding can be changed carefully; preserve base-path and callback behavior |

### Where should a feature go?

| Want to… | Change | Notes |
| --- | --- | --- |
| Use Dark theme first | `static-bootstrap.mjs` `configurationDefaults['workbench.colorTheme']` | Built-in theme; no VSIX needed; the user's stored setting can override the default |
| Enable Open VSX | `static-bootstrap.mjs` `productConfiguration.extensionsGallery`, `index.html` CSP, `runtime.json` | Gallery metadata and downloadable extension assets may use distinct origins |
| Allow the GitHub API | `index.html` `connect-src` | `https://api.github.com` is **not** allowed in current official profiles; browser CORS/COEP still applies |
| Bundle Remotish or a theme extension | `extensions/`, `additional-extensions.json`, `locked-extensions.json`, `extensions.json` | Exact version/hash, browser entry point, dependencies, license, and source approval are required |
| Allow proposed APIs for a known extension | `static-bootstrap.mjs` `productConfiguration.extensionEnabledApiProposals` | Exact extension ID and proposal names, supported by the pinned Code OSS revision; see below |
| Supply custom API credentials | **Do not embed in the archive** | Use a reviewed browser authentication mechanism; never bake a GitHub token into an HTML/JS file or download URL |

## Proposed APIs: Remotish advanced history

**Supported in principle for an archive derivative.** In pinned Code OSS `1.141.0`, the web embedder's `productConfiguration` overrides product settings before extension API proposal policy is initialized. This permits a *specific extension* to use only explicitly named proposals without recompiling the compiled workbench.

An example **effective workbench configuration fragment** (not a standalone file or an already supported COSW configurator option) is:

```js
productConfiguration: {
  enableTelemetry: false,
  extensionEnabledApiProposals: {
    'hrashton.remotish': ['scmHistoryProvider', 'timeline']
  }
}
```

The generated `static-bootstrap.mjs` must preserve the existing security/webview settings alongside this field. Proposal IDs are case-sensitive; extension IDs must match the packaged extension. The **extension manifest/build must actually consume** these APIs. A controlled Remotish history-enabled host declares `enabledApiProposals` for `scmHistoryProvider` and `timeline` and bundles `@remotish/vscode-history`; the [public Open VSX Remotish host](https://github.com/Codellei/remotish/blob/master/docs/code-oss-integration.md) intentionally omits this integration. Installing only the public stable VSIX plus adding grants therefore **does not produce advanced history UI**.

Remotish's current controlled demo targets **Code OSS 1.139.1**, whereas COSW currently pins **1.141.0**. Validate proposal compatibility, host engine constraints, extension activation, history and Timeline against the *exact* COSW version. Neither the existence of `.d.ts` files nor a successful boot proves the integration works.

Do **not** use `enabledExtensionProposedApi: []` (the upstream web embedder's broad allow-all switch) in a distributed customizer. Use scoped `productConfiguration.extensionEnabledApiProposals` grants instead. Missing proposals, multiple unreviewed grants, and extensions that do not declare/use the requested API should be rejected.

The existing source-build policy currently requires an approval record for nonempty grants and explicitly forbids grants in the two tracked official profiles. **The future archive customizer does not yet implement this grant path**. Its design must preserve equally explicit consent/review, per-extension allowlisting, and provenance rather than bypassing the policy unnoticed.

## Remotish + GitHub example

The intended public GitHub feature contains **two extensions**: `hrashton.remotish` (stable host) and `hrashton.remotish-github-provider` (browser provider). The provider depends on Remotish and reads public GitHub repositories anonymously through `https://api.github.com`; it does not provide private-repo authentication or remote push in its published form.

The customizer must add `https://api.github.com` to the page's `connect-src` policy **and** bundle or let the user install both compatible extensions. Browser CORS and hosting headers must permit the required requests; network access is not guaranteed just because CSP allows it. Treat Remotish advanced history as an **additional experimental choice**, not implied by the GitHub provider checkbox.

## Archive transformations versus a rebuild

**Archive-level:** CSP origins, gallery wiring, default editor settings, optional local browser extensions, per-extension proposed-API allowlists, and basic branding can generally be handled by generating the static wrapper and manifests. Exact compatibility must be verified per base version.

**Needs a Code OSS source rebuild or new functionality:** changing the compiled editor, adding a missing upstream API/patch, implementing isolated webviews, native Node/terminal services, or altering the upstream extension host semantics.

## Verification before sharing the customized archive

- [ ] Original release archive checksum verified; flat website-root layout confirmed (`index.html` at root); no path traversal, symlinks, archive bombs or duplicate paths accepted during extraction.
- [ ] Base version and profile recorded; **original** `deployment-profile.json` preserved as base evidence.
- [ ] Resulting `index.html` CSP, `runtime.json` and `static-bootstrap.mjs` agree on effective gallery/network/telemetry/webview policy.
- [ ] All VSIX entries match exact version and SHA-256, have browser entry points and allowed licenses; dependency graph resolved.
- [ ] Proposed grants are per-extension, exist in the exact pinned Code OSS revision, and were visibly opted in; never allow blanket grants.
- [ ] No credentials, unrestricted wildcard origins, unsafe inline scripts, or untrusted HTML/JS injected.
- [ ] App boots and edits files; test extension activation, network requests, CSP/CORS/COEP and (when selected) advanced history.
- [ ] New archive SHA-256 and customization manifest generated; clearly labeled **unofficial derivative / not covered by original attestation**.
- [ ] No claim of official qualified browser support or extension security approval without corresponding evidence.

## Build a web configurator from this guide

Read the [Customizer contract](customizer-contract.md): it is the implementation specification for a future CLI **and** browser-only GitHub Pages UI, including input schema, transformation order, file-level outputs, validation, browser limits and acceptance tests.

