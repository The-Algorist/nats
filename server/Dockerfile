# Use the official Node.js image as the base image
FROM node:14

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json files
COPY package*.json ./

# Install the application dependencies
RUN npm install

# Copy the rest of your application files
COPY . .

# Expose the port that your WebSocket server is running on
EXPOSE 3001

# Command to run your application
CMD ["node", "server.js"]
