#!/usr/bin/env python3
"""Bootstrap pip and install flights package"""
import os
import sys
import urllib.request
import zipfile
import tempfile

# Get user site-packages for installation
user_base = sys.prefix
if hasattr(sys, 'real_prefix'):
    user_base = sys.base_prefix

site_packages = os.path.join(user_base, 'lib', 'python3.12', 'site-packages')
os.makedirs(site_packages, exist_ok=True)

# Bootstrap pip using the official get-pip.py approach
get_pip_url = "https://bootstrap.pypa.io/get-pip.py"
target = "/tmp/get-pip.py"

try:
    with urllib.request.urlretrieve(get_pip_url, target) as (filename, headers):
        print(f"Downloaded get-pip.py")
except Exception as e:
    print(f"Failed to download get-pip.py: {e}")
    sys.exit(1)

# Execute get-pip.py
exec(compile(open(target).read(), target, 'exec'))