# Dockerfile for Spotify Jukebox Server

FROM node:18-alpine

WORKDIR /app

# Copy server files
COPY server/ ./

# Install dependencies
RUN npm install

# Expose port
EXPOSE 5000

# Start the server
CMD ["npm", "start"]