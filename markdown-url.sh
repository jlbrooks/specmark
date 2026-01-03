#!/bin/bash

# Generate a Markdown Annotator URL from a local file
# Usage: markdown-url <file> [host]
# Example: markdown-url spec.md
# Example: markdown-url spec.md http://192.168.4.110:5173

markdown-url() {
  local file="$1"
  local host="${2:-http://claude-host:5173}"

  if [ -z "$file" ]; then
    echo "Usage: markdown-url <file> [host]"
    echo "Example: markdown-url spec.md"
    echo "Example: markdown-url spec.md http://192.168.4.110:5173"
    return 1
  fi

  if [ ! -f "$file" ]; then
    echo "Error: File '$file' not found"
    return 1
  fi

  # Read file and base64url encode
  local encoded=$(cat "$file" | base64 -w 0 | tr '+/' '-_' | tr -d '=')
  local url="${host}/?markdown=${encoded}"

  # Copy to clipboard if available
  if command -v xclip &> /dev/null; then
    echo -n "$url" | xclip -selection clipboard
    echo "✓ URL copied to clipboard:"
  elif command -v pbcopy &> /dev/null; then
    echo -n "$url" | pbcopy
    echo "✓ URL copied to clipboard:"
  else
    echo "URL (copy manually):"
  fi

  echo "$url"
}

# Export the function
export -f markdown-url

# If script is run directly (not sourced), execute the function
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  markdown-url "$@"
fi
