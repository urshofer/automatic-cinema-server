#!/bin/sh
jx package acs.js AutomaticCinemaServer -native
rm -R AutomaticCinemaServer
mkdir AutomaticCinemaServer
cp AutomaticCinemaServer ./AutomaticCinemaServer/
cp start.sh ./AutomaticCinemaServer/
mkdir ./AutomaticCinemaServer/json
mkdir ./AutomaticCinemaServer/tmp
cp -a html ./AutomaticCinemaServer

sips -i icon-server.png
DeRez -only icns icon-server.png > tmpicns.rsrc
Rez -append tmpicns.rsrc -o ./AutomaticCinemaServer/AutomaticCinemaServer
SetFile -a C ./AutomaticCinemaServer/AutomaticCinemaServer
rm tmpicns.rsrc

tar -cvzf AutomaticCinemaServer.tgz AutomaticCinemaServer