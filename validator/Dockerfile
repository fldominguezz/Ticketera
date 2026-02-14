# Use a base image that includes Node.js (for Playwright) and Python (for API tests, Bandit, Pip-audit)
FROM mcr.microsoft.com/playwright/python:v1.49.1-jammy

# Install common utilities with network resilience
RUN sed -i 's|http://archive.ubuntu.com/ubuntu/|http://azure.archive.ubuntu.com/ubuntu/|g' /etc/apt/sources.list && \
    apt-get update -y && \
    apt-get install -y -o Acquire::Retries=3 \
    curl \
    jq \
    git \
    iputils-ping \
    postgresql-client \
    redis-tools \
    python3-venv && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js 20 from NodeSource APT repository
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y -o Acquire::Retries=3 nodejs \
    && npm --version

# Install Python dependencies for security and API tests
# Using binary versions to avoid needing gcc/python3-dev
RUN pip install --no-cache-dir pip-audit bandit requests psycopg2-binary redis

# Set working directory
WORKDIR /app

# Copy the entire project root into the container
COPY . .

# Install Playwright's local dependencies in the e2e directory
RUN cd validator/e2e && npm install

# Add Playwright's local bin directory to PATH for subsequent commands
ENV PATH="/app/validator/e2e/node_modules/.bin:$PATH"

# Debug: Verify playwright executable path
RUN which playwright

# Set entrypoint to the validation script
ENTRYPOINT ["/app/scripts/validate_all.sh"]