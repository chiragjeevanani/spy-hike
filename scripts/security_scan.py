#!/usr/bin/env python3
"""Read-only checks for injected loaders, executable payloads and tracked secrets.

This never imports project modules, loads build configuration, or executes a
scanned file. Use --ref origin/main to inspect incoming Git blobs before merging.
It catches known infection patterns; it is not a general malware guarantee.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
KNOWN_PAYLOADS = {'baecd750d0a11f1eea428a5a07dc53ef1b8227affb5deb86d43d254b031a2ebe'}
HEX_STRING = re.compile(r"['\"][0-9a-fA-F]{512,}['\"]")
ESCAPED_BYTES = re.compile(r'(?:\\x[0-9a-fA-F]{2}){64,}')
INIT_HOOK = re.compile(r'\bnode\s+(?:\./)?init(?:\s|$|&)')
CONFLICT = re.compile(r'(?m)^(?:<{7} .+|={7}$|>{7} .+)$')
REMOTE_SHELL = re.compile(r'\b(?:curl|wget)\b[^\n]*\|\s*(?:ba)?sh\b|\bpowershell\b[^\n]*-(?:enc|encodedcommand)\b', re.I)


def inspect(name, data, mode='100644'):
    issues = []
    path = Path(name)
    if mode in ('120000', '160000'):
        return ['unexpected tracked symlink or submodule; manual review required']
    if hashlib.sha256(data).hexdigest() in KNOWN_PAYLOADS:
        issues.append('known injected loader fingerprint')
    if path.name in ('.env', '.env.local', '.env.production', '.env.development') or (path.name.startswith('.env.') and path.name != '.env.example'):
        issues.append('environment file must not be tracked')
    if path.suffix.lower() in ('.bat', '.cmd', '.ps1'):
        issues.append('unexpected Windows launcher; manual review required')
    if data.startswith((b'\x7fELF', b'MZ', b'\xcf\xfa\xed\xfe', b'\xfe\xed\xfa\xcf')):
        issues.append('unexpected native executable payload')
    try:
        text = data.decode('utf-8')
    except UnicodeDecodeError:
        return issues
    executable_js = path.suffix in ('.js', '.jsx', '.mjs', '.cjs') or path.name == 'init'
    if executable_js and (HEX_STRING.search(text) or ESCAPED_BYTES.search(text)):
        issues.append('large encoded JavaScript payload; manual review required')
    if executable_js and path.name == 'init':
        issues.append('unreviewed bare init loader')
    if CONFLICT.search(text):
        issues.append('unresolved merge conflict markers')
    if path.suffix in ('.js', '.mjs', '.cjs', '.sh', '.json') and REMOTE_SHELL.search(text):
        issues.append('remote shell execution command')
    if name.endswith('package.json'):
        try:
            package = json.loads(text)
            for key, command in package.get('scripts', {}).items():
                if INIT_HOOK.search(str(command)):
                    issues.append(f'npm script {key!r} invokes injected init loader')
        except json.JSONDecodeError:
            issues.append('invalid package manifest')
    if name.endswith('package-lock.json'):
        try:
            for key, package in json.loads(text).get('packages', {}).items():
                url = package.get('resolved', '')
                if url and not url.startswith('https://registry.npmjs.org/'):
                    issues.append(f'non-registry dependency source: {key}')
        except json.JSONDecodeError:
            issues.append('invalid dependency lockfile')
    if name == '.gitignore':
        ignored = set(text.splitlines())
        if not {'.env', '.env.*'}.issubset(ignored):
            issues.append('missing environment secret ignore rules')
    return issues


def git(*args):
    return subprocess.check_output(['git', '-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false', *args], cwd=ROOT)


def entries(ref=None):
    if ref:
        tree = git('rev-parse', '--verify', '--end-of-options', ref + '^{tree}').decode().strip()
        for entry in git('ls-tree', '-rz', tree).split(b'\0'):
            if not entry:
                continue
            meta, name = entry.split(b'\t', 1)
            mode, kind, oid = meta.decode().split()
            data = git('cat-file', 'blob', oid) if kind == 'blob' else b''
            yield name.decode(), data, mode
    else:
        names = set(git('ls-files', '-z', '--cached', '--others', '--exclude-standard').split(b'\0'))
        for raw in sorted(names):
            if not raw:
                continue
            name = raw.decode()
            path = ROOT / name
            if path.is_symlink():
                yield name, b'', '120000'
            elif path.is_file():
                yield name, path.read_bytes(), '100644'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ref', help='inspect a Git tree without checking it out')
    args = parser.parse_args()
    findings = []
    count = 0
    for name, data, mode in entries(args.ref):
        count += 1
        findings.extend(f'{name}: {issue}' for issue in inspect(name, data, mode))
    for finding in findings:
        print('BLOCK:', finding)
    if findings:
        print(f'FAILED: {len(findings)} findings across {count} files; no scanned code was executed.')
        return 1
    print(f'PASS: {count} files checked; no known loader, tracked secret, or execution indicators found.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
