# Automatic Cinema Server

**Prerequisites**

In order to run the Automatic Cinema Server, you need to install

- Node: ```http://nodejs.org```
- NPM: ```https://www.npmjs.org/doc/README.html```
- ImageMagick and FFMpeg

FFMpeg and ImageMagick exist in precompiled versions for OSX. Make sure that you put the ffmpeg binaries somwhere within the path environment.

- FFMpeg: ```http://ffmpegmac.net```
- ImageMagick: ```http://www.imagemagick.org/download/binaries/ImageMagick-x86_64-apple-darwin13.2.0.tar.gz``` or as a bundled installer ```http://cactuslab.com/imagemagick/```

Linux: Use apt-get or similiar packet managers depending on your distribution.

**Installation**

- Download or Clone the Server from ```https://github.com/urshofer/automatic-cinema-server```
- Change into the directory and install the dependencies: 
  
```
$ npm install (or) 
$ sudo npm install
```


**Configuration**

- Probably you need to change the path to ImageMagick's convert command and ffmpeg. If you leave the variables empty, the server assumes that ffmpeg and convert are within the path environment.
  
```
Examples:

_Subdirectory of the server_
ffmpeg_path: 		__dirname + '/bin/osx/ffmpeg/bin/'

_Subdirectory of the library directory (whereas subdirectory defaults to __dirname)_
ffmpeg_path: 		GLOBAL.lib_name + '/bin/osx/ffmpeg/bin/'

_Absolute path_
convert_path: 		'/opt/ImageMagick/bin/'

_Default settings_
convert_path: 		''

```

- The server uses Port 3000 by default. Unless you have other services running or firewall restrictions, you can leave the default settings.
- Most configuration values are self explanatory.
- Be aware that the nlp feature is experimental. It aims to auto-generate keyword matrices from complex input strings. It is mainly used by Heksler and its auto-tagger feature. If you want to use it, rename package.json.nlp to package.json before installing the modules.

**Run the Server**

- To start the server in non daemon mode. If the -l=libdir option is omitted, it will be substituted by __dirname, the directory the server script is stored.

```
$ node acs.js [-l=libdir]
```

- To run the script in daemon mode, you can use the forever package:

```
$ sudo npm install forever -g
$ forever start acs.js
$ forever stop acs.js
```
