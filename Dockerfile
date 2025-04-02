# Step 1: Build React App
FROM node:20 AS build

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install -g npm@latest
RUN npm ci

# Copy the rest of the app
COPY . .

# Optimize memory for Raspberry Pi
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV GENERATE_SOURCEMAP=false
ENV DISABLE_ESLINT_PLUGIN=true
ENV REACT_APP_FAST_REFRESH=false

# Build React app
RUN npm run build

# Optional: remove node_modules and devDeps
RUN rm -rf node_modules && npm ci --omit=dev

# Step 2: Serve with Nginx
FROM nginx:alpine

# Copy built React app
COPY --from=build /app/build /usr/share/nginx/html

# Copy Nginx config template and entrypoint
COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY entrypoint.sh /entrypoint.sh

# 🔧 Convert CRLF to LF just in case
RUN sed -i 's/\r$//' /entrypoint.sh

RUN chmod +x /entrypoint.sh

# Use custom entrypoint to render nginx config dynamically
ENTRYPOINT ["/entrypoint.sh"]