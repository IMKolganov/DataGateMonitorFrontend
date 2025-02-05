# Step 1: Build React App
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy the rest of the app
COPY . .

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

EXPOSE 5582

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
