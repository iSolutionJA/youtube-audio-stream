# Install node on alpine linux
FROM node:10.15-alpine

# Install ffmpeg
RUN apk update && apk add --no-cache ffmpeg

# Install package and run example
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "./"]
RUN npm install && mv node_modules ../
COPY . .
EXPOSE 3000
CMD npm run example
