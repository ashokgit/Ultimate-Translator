# Use the official Node.js v18.x image as the base image (LTS)
FROM node:18-alpine

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY --chown=nodeuser:nodejs . .

# Create logs directory and set permissions
RUN mkdir -p logs && chown -R nodeuser:nodejs logs

# Remove development files
RUN rm -rf test/ .git/ .gitignore

# Use non-root user
USER nodeuser

# Expose port (configurable via environment variable)
EXPOSE ${PORT:-3000}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/api/v1/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the web service
CMD ["npm", "start"]
