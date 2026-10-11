from __future__ import annotations

import json
import os
import subprocess
import tempfile
import textwrap
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/publish_oci_aliases.sh'
IMAGE = 'ghcr.io/codellei/code-oss-static-web'
DIGEST = 'sha256:' + 'a' * 64
OTHER_DIGEST = 'sha256:' + 'b' * 64


class OCIImageAliasTests(unittest.TestCase):
    def invoke(
        self,
        tag: str = 'v1.141.0-web.2',
        *,
        alias_mismatch: bool = False,
        missing_arm64: bool = False,
    ) -> tuple[subprocess.CompletedProcess[str], list[list[str]]]:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            docker = root / 'docker'
            log = root / 'docker-calls.jsonl'
            docker.write_text(
                textwrap.dedent(
                    """\
                    #!/usr/bin/env python3
                    import json
                    import os
                    import sys

                    args = sys.argv[1:]
                    with open(os.environ['MOCK_DOCKER_LOG'], 'a', encoding='utf-8') as log:
                        log.write(json.dumps(args) + '\\n')

                    if args[:3] == ['buildx', 'imagetools', 'inspect']:
                        ref = args[3]
                        digest = os.environ['MOCK_DIGEST']
                        if ref.endswith(':latest') and os.getenv('MOCK_ALIAS_MISMATCH'):
                            digest = os.environ['MOCK_OTHER_DIGEST']
                        platforms = [{'os': 'linux', 'architecture': 'amd64'}]
                        if not os.getenv('MOCK_MISSING_ARM64'):
                            platforms.append({'os': 'linux', 'architecture': 'arm64'})
                        print(json.dumps({
                            'digest': digest,
                            'manifests': [{'platform': platform} for platform in platforms],
                        }))
                    elif args[:3] != ['buildx', 'imagetools', 'create']:
                        sys.exit(3)
                    """
                ),
                encoding='utf-8',
            )
            docker.chmod(0o755)
            env = {
                **os.environ,
                'PATH': f'{root}:{os.environ["PATH"]}',
                'MOCK_DOCKER_LOG': str(log),
                'MOCK_DIGEST': DIGEST,
                'MOCK_OTHER_DIGEST': OTHER_DIGEST,
            }
            if alias_mismatch:
                env['MOCK_ALIAS_MISMATCH'] = '1'
            if missing_arm64:
                env['MOCK_MISSING_ARM64'] = '1'

            result = subprocess.run(
                ['bash', str(SCRIPT), IMAGE, tag],
                text=True,
                capture_output=True,
                check=False,
                env=env,
            )
            calls = (
                [json.loads(line) for line in log.read_text(encoding='utf-8').splitlines()]
                if log.exists()
                else []
            )
            return result, calls

    def test_publishes_two_aliases_from_immutable_digest(self) -> None:
        result, calls = self.invoke()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(calls), 4)
        self.assertEqual(
            calls[0],
            [
                'buildx',
                'imagetools',
                'inspect',
                f'{IMAGE}:v1.141.0-web.2',
                '--format',
                '{{json .Manifest}}',
            ],
        )
        self.assertEqual(
            calls[1],
            [
                'buildx',
                'imagetools',
                'create',
                '--tag',
                f'{IMAGE}:1.141',
                '--tag',
                f'{IMAGE}:latest',
                f'{IMAGE}@{DIGEST}',
            ],
        )
        self.assertEqual(calls[2][3], f'{IMAGE}:1.141')
        self.assertEqual(calls[3][3], f'{IMAGE}:latest')

    def test_other_upstream_series_uses_its_own_alias(self) -> None:
        result, calls = self.invoke('v2.142.1-web.0')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(f'{IMAGE}:2.142', calls[1])

    def test_invalid_tag_never_touches_registry(self) -> None:
        result, calls = self.invoke('1.141')
        self.assertEqual(result.returncode, 2)
        self.assertEqual(calls, [])

    def test_missing_platform_prevents_publish(self) -> None:
        result, calls = self.invoke(missing_arm64=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(len(calls), 1)

    def test_alias_digest_mismatch_fails(self) -> None:
        result, calls = self.invoke(alias_mismatch=True)
        self.assertEqual(result.returncode, 1)
        self.assertEqual(len(calls), 4)
        self.assertIn('digest mismatch', result.stderr)


if __name__ == '__main__':
    unittest.main()
