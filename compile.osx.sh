#!/bin/sh
rm -R ACServer
rm AutomaticCinemaServer*
jx package acs.js AutomaticCinemaServer -native
mkdir ACServer
cp AutomaticCinemaServer ./ACServer/
cp start.sh ./ACServer/
mkdir ./ACServer/json
touch ./ACServer/json/.blank
mkdir ./ACServer/tmp
touch ./ACServer/tmp/.blank
cp -a html ./ACServer

sips -i icon-server.png
DeRez -only icns icon-server.png > tmpicns.rsrc
Rez -append tmpicns.rsrc -o ./ACServer/AutomaticCinemaServer
SetFile -a C ./ACServer/AutomaticCinemaServer
rm tmpicns.rsrc

tar -cvzf AutomaticCinemaServer.tgz ACServer