#!/bin/sh
set -e

host="$1"
port="$2"
shift 2


if [ $# -eq 0 ]; then
  echo "Error: No command specified"
  exit 1
fi

until nc -z "$host" "$port"; do
  echo "Waiting for $host:$port ..."
  sleep 1
done

echo "$host:$port is available, executing command..."
exec "$@"
