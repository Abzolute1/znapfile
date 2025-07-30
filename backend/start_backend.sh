#!/bin/bash

# Activate virtual environment
source venv/bin/activate

# Start uvicorn with large file upload support
uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --reload \
    --limit-concurrency 1000 \
    --limit-max-requests 10000 \
    --timeout-keep-alive 300 \
    --log-level info