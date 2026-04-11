#!/usr/bin/env python3
"""Download pip wheel and install to user site"""
import urllib.request
import zipfile
import os
import sys

site_packages = os.path.join(sys.prefix, 'lib', 'python3.12', 'site-packages')
os.makedirs(site_packages, exist_ok=True)

# Download pip wheel
url = "https://files.pythonhosted.org/packages/ef/85/8b48f8a0ea40c4b15f9c6af1eb96f6799b3b7c6b90ed0c33b4c5e3c4d2b1/pip-24.0-py3-none-any.whl"
dest = "/tmp/pip.whl"

print(f"Downloading pip from {url}...")
urllib.request.urlretrieve(url, dest)
print("Downloaded. Extracting...")

with zipfile.ZipFile(dest, 'r') as z:
    z.extractall(site_packages)

print(f"Installed pip to {site_packages}")

# Add the bin path
pip_bin = os.path.join(sys.prefix, 'bin')
os.makedirs(pip_bin, exist_ok=True)

# Create pip symlink/script
pip_exe = os.path.join(pip_bin, 'pip')
with open(pip_exe, 'w') as f:
    f.write('#!/usr/bin/env python3\n')
    f.write('from pip._internal.cli.main import main\n')
    f.write('import sys\nsys.exit(main())\n')

os.chmod(pip_exe, 0o755)
print(f"Created pip at {pip_exe}")