# Use a base image that includes Node.js (for Playwright) and Python (for API tests, Bandit, Pip-audit)
FROM mcr.microsoft.com/playwright/python:v1.41.0-jammy

# Install common utilities
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    git \
    libpq-dev \
    gcc \
    python3-dev \
    postgresql-client \
    redis-tools \
    # npm is installed via Node.js installation below \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 from NodeSource APT repository
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Install Python dependencies for security and API tests
# Install pip-audit and bandit
RUN pip install pip-audit bandit requests

# Set working directory
WORKDIR /app

# Copy the entire project root into the container
# This should place frontend, backend, scripts, validator directories directly under /app
COPY . .

# Install Node.js dependencies for frontend (if any)
RUN cd frontend && npm install

# Install Playwright's local dependencies in the e2e directory
# Assuming validator/e2e/package.json exists and lists @playwright/test
RUN cd validator/e2e && npm install
RUN npx playwright install --with-deps chromium

# Add Playwright's local bin directory to PATH for subsequent commands
ENV PATH="/app/validator/e2e/node_modules/.bin:$PATH"

# Debug: Verify playwright executable path
RUN which playwright

# Set entrypoint to the validation script
ENTRYPOINT ["/app/scripts/validate_all.sh"]