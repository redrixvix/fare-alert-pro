import subprocess
result = subprocess.run(['python3', '-c', 
    'import sys; sys.path.insert(0, "/home/rixvix/.local/lib/python3.12/site-packages"); import flights; print("ok")'],
    capture_output=True, text=True)
print(result.stdout)
print(result.stderr)