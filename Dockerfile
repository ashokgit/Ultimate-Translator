# Use the official Node.js v14.x image as the base image
FROM node:14

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the entire project directory to the working directory
COPY . .

# Copy the server.js file from the root of the project to the working directory
# COPY server.js .

# Expose port 3000
EXPOSE 3000

# Start the web service
CMD ["node", "server.js"]
