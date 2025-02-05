# Step 1: Build React App
FROM node:18-alpine AS build

WORKDIR /app

# Install only prod-requerements
COPY package.json package-lock.json ./
RUN npm ci --production

COPY . . 

RUN npm run build

# Step 2: Serve with Nginx
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5582

CMD ["nginx", "-g", "daemon off;"]
