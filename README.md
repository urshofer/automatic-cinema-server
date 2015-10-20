# Automatic Cinema Server

**Prerequisites**

In order to run the Automatic Cinema Server, you need to install

- Node: ```http://nodejs.org```
- NPM: ```https://www.npmjs.org/doc/README.html```
- ImageMagick
- FFmpeg

FFmpeg and ImageMagick exist in precompiled versions for various platforms:

- OSX: ```http://ffmpegmac.net``` and ```http://www.imagemagick.org/download/binaries/ImageMagick-x86_64-apple-darwin13.2.0.tar.gz```
- Linux: Use apt-get or similiar packet managers depending on your distribution.

**Installation**

- Download or Clone the Server from ```https://github.com/urshofer/automatic-cinema-server```
- Install the dependencies: ```npm install``` or ```sudo npm install```in the directory you just checked out the files
- Edit the configuration file: _config.js

**Configuration**

- Most likely, you need to change the path to ImageMagick's convert command and ffmpeg:

    ffmpeg_path: 		__dirname + '/bin/osx/ffmpeg/bin/'
    convert_path: 		'/opt/ImageMagick/bin/'

- The server uses Port 3000 by default. Unless you have other services running or firewall restrictions, you can leave the default settings.
- Most configuration values are self explanatory.
- Be aware that the nlp feature is experimental. It aims to auto-generate keyword matrices from complex input strings. It is mainly used by Heksler and its auto-tagger feature. If you want to use it, rename package.json.nlp to package.json before installing the modules.

**Run the Server**

- To start the server in non daemon mode: 

    $ node acs.js

- To run the script in daemon mode, you can use the forever package:

    $ sudo npm install forever -g
    $ forever start acs.js
    $ forever stop acs.js