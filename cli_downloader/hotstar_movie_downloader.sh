#!/bin/bash
printf  "Hotstar movie Stream Downloader - 1.0\n\n"
printf "Description : Command Line Tool for downloading streaming videos from hotstar.\n\n"



echo -n "Paste Hotstar movie video url > "
read HOTSTAR_URL

URL_ARR=(${HOTSTAR_URL//// })

MEDIA_ID=${URL_ARR[-1]}
MEDIA_NAME=${URL_ARR[-2]}



printf  "Hotstar Media ID : $MEDIA_ID\n\n"

responseContent=$(curl -X GET "http://getcdn.hotstar.com/AVS/besc?action=GetCDN&appVersion=5.0.40&asJson=Y&channel=TABLET&id=$MEDIA_ID&type=VOD")

mediaPlayListURL=$(echo "$responseContent" | ./libs/jqs.exe -r '.resultObj.src')

printf  "Downloading Video .... \n\n"
printf  "File Name : $MEDIA_NAME\n\n"

$(./libs/ffmpeg/ffmpeg.exe -i "$mediaPlayListURL" -bsf:a aac_adtstoasc -c copy "$MEDIA_NAME.mp4")

printf "Downloaded Successfully\n"