# Automatic Cinema Server

**Prerequisites**

In order to run the Automatic Cinema Server, you need to install

- MongoDB: ```http://www.mongodb.org/downloads```
- Node.js Server: ```http://nodejs.org```
- The npm ecosystem: ```https://www.npmjs.org/doc/README.html```
- ImageMagick
- FFmpeg

FFmpeg and ImageMagick exist in precompiled versions for various platforms:

- OSX: ```http://ffmpegmac.net``` and ```http://www.imagemagick.org/download/binaries/ImageMagick-x86_64-apple-darwin13.2.0.tar.gz```
- Linux: Use apt-get or similiar packet managers depending on your distribution.

**Installation**

- Download or Clone the Server from ```https://github.com/urshofer/automatic-cinema-server```
- Install the dependencies: ```npm install``` or ```sudo npm install```in the directory you just checked out the files
- Edit the configuration file: _config.js

**Run the Server**

- To start the server in non daemon mode: ```node acs.js```
- To run the script in daemon mode, you can install forever: ```sudo npm install forever -g```. After that, you can run the script in the background with the command ```forever start acs.js```. If you want to stop it you can do it with ```forever stop acs.js```