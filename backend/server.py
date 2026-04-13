# This file bridges the supervisor (which expects a Python ASGI app) to our Node.js backend.
# When uvicorn imports this module, os.execvp replaces the Python process with Node.js.
import os
import sys

# Replace the current Python process with Node.js
server_dir = os.path.dirname(os.path.abspath(__file__))
server_js = os.path.join(server_dir, 'server.js')

os.execvp('node', ['node', server_js])
