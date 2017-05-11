#!/bin/sh
printf -e "Voot Video Stream Downloader - 1.0\n\n"
printf -e "Description : Command Line Tool for downloading streaming videos.\n\n"

echo -n "Paste Voot video url > "
read VOOT_URL

URL_ARR=(${VOOT_URL//// })

MEDIA_ID=${URL_ARR[-1]}

DEST_DIRECTORY="./"

printf -e "Voot Media ID : $MEDIA_ID\n\n"

responseContent=$(curl -X GET -H "Accept: application/json" "https://wapi.voot.com/ws/ott/getMediaInfo.json?platform=Web&pId=2&mediaId=$MEDIA_ID")

mediaPlayListURL=$(echo "$responseContent" | ./libs/jqs.exe -r '.assets.URL')
mediaFileName=$(echo "$responseContent" | ./libs/jqs.exe -r '.assets.MediaName')

printf  "Downloading Video .... \n\n\n\n"
printf  "File Name : $mediaFileName\n\n\n"

$(./libs/ffmpeg/ffmpeg.exe -i "$mediaPlayListURL" -bsf:a aac_adtstoasc -c copy "$DEST_DIRECTORY/$mediaFileName.mp4")

printf "Downloaded Successfully\n"