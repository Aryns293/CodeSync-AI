# Language runtime image used ONLY for running untrusted submitted code.
# Build once: docker build -t realtime-ide-sandbox ./backend/execution-image
FROM ubuntu:24.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ \
    python3 \
    default-jdk-headless \
    nodejs \
    && rm -rf /var/lib/apt/lists/*

# Never run submitted code as root inside the container.
RUN useradd -m runner
USER runner
WORKDIR /sandbox
