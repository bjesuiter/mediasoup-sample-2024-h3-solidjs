FROM oven/bun:latest

# Set working directory
WORKDIR /app

# Copy package.json and bun.lockb
COPY package.json ./

# Install dependencies
RUN bun install

# Copy the rest of the application code
COPY . .

# Expose the application port
EXPOSE 8000

# Start the application
CMD ["bun", "dev"]