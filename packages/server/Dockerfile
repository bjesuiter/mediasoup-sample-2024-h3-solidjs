# FROM ubuntu
# COPY --from=denoland/deno:bin-2.1.9 /deno /usr/local/bin/deno

# Use the official Deno image as the base image
FROM denoland/deno:2.1.9

USER deno

# Set the working directory
WORKDIR /app

COPY package.json ./

# Install dependencies
RUN deno install --allow-scripts=npm:mediasoup@3.15.3

# Copy the project files to the working directory
COPY . .

# Compile the main app so that it doesn't need to be compiled each startup/entry.
RUN deno cache server.ts

# Expose the port the app runs on
EXPOSE 4000

# Run the application
CMD ["run", "-A", "--unstable-sloppy-imports", "server.ts"]