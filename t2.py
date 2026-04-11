import subprocess
result = subprocess.run(['python3', '-m', 'pip', 'show', 'flights'], capture_output=True, text=True)
print(result.stdout)
print(result.stderr)