# Ready-to-use (`company-standard`)

**Ready-to-use** is the variant published through GitHub Releases and Docker
and promoted to the GitHub Pages demo. It uses the `company-standard` build
profile with an **Open VSX-enabled** extension gallery and reviewed registry/CDN
network origins. The release currently contains no extra third-party extensions
or proposed-API grants.

For a minimal, gallery-free build with a self-only network policy, see
[Clean (`baseline-static`)](clean.md). Clean is **not currently published as a
separate release**: switching profiles requires a new build and qualification,
not a Docker environment variable or an edit to the distributed files.

Neither profile supports offline operation; both disable Code OSS host telemetry
and webviews.

## Try the demo

GitHub Pages stable promotion serves the **same qualified Ready-to-use archive**
as the release and Docker image. Find the live site link (when deployed) in
[GitHub Pages deployments](https://github.com/Codellei/code-oss-static-web/deployments/github-pages).
The demo is **not** the Clean profile.

## Run the published Docker image

```sh
docker run --rm -p 127.0.0.1:8080:8080 ghcr.io/codellei/code-oss-static-web:<release-tag>
```

Open `http://127.0.0.1:8080/`. The image serves the *same static artifact* as
the release tarball, so Docker environment variables cannot enable a gallery
or inject extensions. For a public instance, terminate TLS at the serving edge,
verify the CSP/COEP/CORS path, and record browser/deployment qualification.
For site paths other than `/`, configure the reverse proxy and preserve
relative asset locations.

## Host the Ready-to-use release archive

```sh
mkdir -p site
tar -xzf code-oss-static-web-<version>.tar.gz -C site
```

The published `.tar.gz` uses **flat website-root paths** with no enclosing `dist/` folder or `./` root entry. After extraction, the entry point is `site/index.html` and the bootstrap is `site/static-bootstrap.mjs`. The internal CI distribution tarballs now use the same extraction-root layout; that CI change did not alter existing public release archives.

Download the archive from [Releases](https://github.com/Codellei/code-oss-static-web/releases/latest)
and substitute its version in the command. Serve the files as static assets with
correct MIME types, not with a VS Code server process. This published archive
is **Ready-to-use**, not Clean. To build the gallery-free variant, follow the
[Clean build guide](clean.md).

Editing an attested archive in place creates a **different, unsupported
artifact**; its released checksums and signature no longer describe the bytes.

## Customize this release

The published archive is immutable and attested, but you may use its verified bytes as the **base for a separate customized derivative** (gallery, specific API origins, additional browser extensions, default theme, or scoped proposed-API grants). The resulting archive has its own identity and is not covered by the original release's attestation. See [which release files can be changed](artifact-customization.md) and the [proposed browser customizer contract](customizer-contract.md).

## Open a local folder (Chromium)

In Chrome or Edge on a secure origin, choose **File: Open Folder...**
from the command palette or File menu, then grant directory access in the
browser picker. Code-OSS handles file reads/writes with its built-in
`HTMLFileSystemProvider`; COSW does not copy files onto a server or implement
a second filesystem.

The chosen workspace is restored across same-tab reloads using tab session
storage. Directory handles and permissions remain browser-managed. Access
may need to be granted again, and clearing site data can discard saved handles.
This feature does not provide local Git commands or terminals, and browser
engines without File System Access are not supported for local folders.

## Marketplace

`company-standard` configures the Open VSX extension gallery using the
[official Open VSX product settings](https://github.com/eclipse-openvsx/openvsx/wiki/Using-Open-VSX-in-VS-Code).
At startup `static-bootstrap.mjs` supplies `extensionsGallery` to the web
embedder; the generated CSP admits only `open-vsx.org` and
`openvsx.eclipsecontent.org` for image/connection loading.
The gallery is **not** Microsoft's Visual Studio Marketplace, which restricts
access from alternative Code OSS distributions.

Open **Extensions** in the workbench to search for and install an extension.
Only extensions with a **browser** entry point and no unsupported native/Node
requirements can run. Some gallery assets or downloads may fail due to
browser CORS/COEP policy, CDN changes, extension incompatibility, or deployment
network policy. The availability of a gallery listing is not a compatibility
or security approval. Users may install additional code at their own risk.

**Marketplace choice:** only one registry is wired into a given qualified
release. A company-hosted Open VSX-compatible registry is possible with a
new reviewed deployment profile and corresponding CSP/network allowlist,
browser tests, and release qualification. Do not point COSW at Microsoft's
Marketplace, or treat `runtime.json` as a runtime gallery toggle.

## Bundled/required extensions

For reproducible preinstallation, put approved extensions into
`extensions/extensions.lock.json`, following [Extensions](../extensions/README.md)
and the [internal mirror procedure](extension-mirror.md). Every entry needs
a version, SHA-256, license, browser entry point, approved immutable source,
malware scan and reviewer. COSW copies these extensions into `dist/extensions/`,
updates `additional-extensions.json`, and includes them in the SBOM and
license inventory. Production policy currently requires an immutable internal
mirror and the lock is **empty**, so the published image contains **no extra
third-party extensions** until reviewers admit them. There is no supported
`docker exec code --install-extension` path: the image is only Nginx.

Candidate starter list (discovery guidance, **not** automatic installs):

| Extension ID | Possible use | Admission status |
| --- | --- | --- |
| `esbenp.prettier-vscode` | Formatting | Candidate; verify browser entry point, license, exact VSIX and version |
| `usernamehw.errorlens` | Inline diagnostics | Candidate; verify browser support and policy |
| `redhat.vscode-yaml` | YAML language features | Candidate; assess language-server/browser dependencies |
| `dbaeumer.vscode-eslint` | JavaScript linting | Candidate; check Node/workspace requirements |
| `hrashton.remotish` | **Developer's development / experimental** | Not a supported or approved extension; no proposed-API grant, no bundling |

The first four entries are **suggestions**, not verified COSW compatibility
claims. Evaluate each exact version in the target browser before adding a
production mirror lock entry. The development-only entry requires its own
testing and explicit separate review of any unstable APIs it requests.

## GitHub Pages promotion

The automatic Pages canary/stable workflow extracts and serves the **exact
qualified tarball**. As the default release build selects `company-standard`,
both Pages and the published Docker image inherit the same Open VSX settings
and **the same approved locked extensions**. A future locked-extension addition
therefore requires a new build/release; Pages promotion never adds untracked
extensions or edits the app after attestation. Previous releases/rollbacks
retain whatever profile they were originally built with.

Extension UI installation persists in each user's browser origin storage; it
does not add files to the running Docker container or the immutable Pages
distribution, and there is no server-side shared extension state.

## Qualification and support boundary

The default gallery is opt-in **network access by the deployed product**:
browser requests can reach the approved registry and its file endpoint.
Telemetry for the COSW host is off, but **third-party extensions may implement
their own telemetry/network requests**. Require explicit company review before
broad deployment. Verify live search, compatible web-VSIX install/activation,
reload persistence, CORS/COEP responses, mixed-content rules, and the exact
proxy/browser combination. The browser qualification suite also probes the live Open VSX query endpoint
from the page, enforcing CSP/CORS access; it does not test workbench-driven
VSIX installation or certify arbitrary extensions. The 2026-10-10 manual
search/install smoke check described in [ADR-0007](adr/0007-open-vsx-ready-profile.md)
does not replace deployment qualification. Before claiming gallery-install
support for a particular environment, record the immutable artifact and
profile digests, browser/OS/host/proxy tuple, tested extension ID/version,
install/activation/reload outcomes, and evidence references. Enterprise
support additionally requires the independent review described in
[Compatibility](../COMPATIBILITY.md#manual-deployment-qualification) and the
[qualification record template](enterprise-browser-qualification-record.md).
