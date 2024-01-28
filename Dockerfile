# Use the latest Node.js Debian image
FROM node:alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run your app
CMD [ "npm", "start" ]