# Dockerfile for Script Labs App
# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the app
COPY . .

# Expose port (change if your app uses a different port)
EXPOSE 3000

# Start the server
CMD ["node", "backend/server.js"]

# Link package to repository
LABEL org.opencontainers.image.source="https://github.com/hendrich/script-labs"