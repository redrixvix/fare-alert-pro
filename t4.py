import sys
print(f"sys.prefix: {sys.prefix}")
print(f"sys.base_prefix: {getattr(sys, 'real_prefix', sys.base_prefix)}")

# Check the user site-packages path
import site
print(f"site-packages: {site.getusersitepackages()}")

# Show all paths
for p in sys.path:
    print(f"  {p}")