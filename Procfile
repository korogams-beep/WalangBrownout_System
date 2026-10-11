# ISSUE-006: Use a production-grade static file server instead of the Vite
# dev server. The dev server is single-threaded, unoptimised, and not meant
# for production traffic. `serve` handles concurrent requests correctly.
#
# -s  SPA mode — unknown paths fall through to index.html (React Router)
# -l  bind to the PORT env var injected by Railway / Heroku at runtime
# --no-clipboard  non-interactive; do not try to copy the URL to a clipboard
web: npx serve -s dist -l $PORT --no-clipboard
