# Step 1: Build React App
FROM node:20 AS build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

RUN npm install -g npm@latest

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy the rest of the app
COPY . .

# 🔹 Optimazi memory for Raspberry Pi 🔹
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV GENERATE_SOURCEMAP=false
ENV DISABLE_ESLINT_PLUGIN=true
ENV REACT_APP_FAST_REFRESH=false

# Build the app
RUN npm run build

# Remove node_modules and install only production dependencies
RUN rm -rf node_modules && npm ci --omit=dev

# Step 2: Serve with Nginx
FROM nginx:alpine

# Copy built React files to Nginx's HTML directory
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]