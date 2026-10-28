#!/bin/sh
set -e

# /app/uploads is normally a mounted volume for persistence across deployments.
# When Docker auto-creates a bind-mount source (or a fresh named volume) it is
# owned by root, but the app runs as the unprivileged appuser — so without this,
# fs.mkdirSync() under it fails with EACCES. Fix ownership here, while still root,
# then drop to appuser before exec'ing the real command.
mkdir -p /app/uploads/employee-documents
chown -R appuser:appgroup /app/uploads

exec su-exec appuser:appgroup "$@"
