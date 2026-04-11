#!/usr/bin/env python3
import sys
print(f"Python version: {sys.version}")
try:
    import pip
    print(f"pip version: {pip.__version__}")
except ImportError:
    print("pip not available")

# Try to install flights via ensurepip bootstrap
try:
    import ensurepip
    print("ensurepip available")
except ImportError:
    print("ensurepip not available")

# Check for venv
import sys
print(f"Executable: {sys.executable}")
print(f"Path: {sys.path[:3]}")