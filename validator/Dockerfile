# Use a base image that includes Node.js (for Playwright) and Python (for API tests, Bandit, Pip-audit)
FROM mcr.microsoft.com/playwright/python:v1.49.1-jammy

# Install common utilities
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    git \
    libpq-dev \
    gcc \
    python3-dev \
    postgresql-client \
    redis-tools && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js 20 from NodeSource APT repository
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm --version

# Install Python dependencies for security and API tests
RUN pip install pip-audit bandit requests psycopg2-binary redis

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