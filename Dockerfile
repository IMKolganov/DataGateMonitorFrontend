# Step 1: Build Vite App
FROM node:20 AS build

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install -g npm@latest
RUN npm ci

# Copy the rest of the app
COPY . .

# Optimize memory for Raspberry Pi (optional)
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV GENERATE_SOURCEMAP=false

# Build the app
RUN npm run build

# Optional: remove node_modules and dev dependencies
RUN rm -rf node_modules && npm ci --omit=dev

# Step 2: Serve with Nginx
FROM nginx:alpine

# Copy built app from Vite's output folder
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config and entrypoint
COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY entrypoint.sh /entrypoint.sh

# Normalize line endings (in case on Windows)
RUN sed -i 's/\r$//' /entrypoint.sh

RUN chmod +x /entrypoint.sh

# Use entrypoint that renders nginx config from template
ENTRYPOINT ["/entrypoint.sh"]