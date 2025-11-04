FROM node:18-alpine

# Install git for repository cloning
RUN apk add --no-cache git

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

CMD ["node", "jira-monitor-agent.js"]

