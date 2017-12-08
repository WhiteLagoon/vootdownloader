#!/bin/bash
printf  "Voot Video Stream Downloader - 1.0\n\n"
printf "Description : Command Line Tool for downloading streaming videos.\n\n"
VOOT_URL=$1
echo "Voot Video URL : $VOOT_URL\n\n"
URL_ARR=(${VOOT_URL///// })
echo "decoded $URL_ARR"
MEDIA_ID=${URL_ARR[${#URL_ARR[@]} - 1]}
DEST_DIRECTORY="./home"
printf "Voot Media ID : $MEDIA_ID\n\n"
