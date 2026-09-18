#!/bin/sh
set -eu

require_key() {
  case "$2" in
    *[![:space:]]*) ;;
    *) printf '%s is required. Enter it in Render before deploying.\n' "$1" >&2; exit 1 ;;
  esac
}

require_key TYPESAFE_API_KEY "${TYPESAFE_API_KEY:-}"
require_key OPENROUTER_API_KEY "${OPENROUTER_API_KEY:-}"
