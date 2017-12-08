#!/bin/bash
printf  "Alt Balaji Stream Downloader - 1.0\n\n"
printf "Description : Command Line Tool for downloading streaming videos from altbalaji.\n\n"

echo -n "Paste Alt Balaji episode url > "
read URL

URL_ARR=(${URL//// })
MEDIA_ID=${URL_ARR[-1]}

printf  "Episode Media ID : $MEDIA_ID\n\n"

responseContent=$(curl -X GET "https://api.cloud.altbalaji.com/media/videos/$MEDIA_ID?domain=IN")

title=$(echo "$responseContent" | ../jqs.exe -c '.titles.default')
mediaPlayListURL=$(echo "$responseContent" | ../jqs.exe -c '[.streams.web[] | select(.src | contains(".mpd"))]' | ../jqs.exe -r '.[0].src')

printf  "Downloading Video .... \n\n"

echo "Media Url : $mediaPlayListURL"
echo "Media Title : $title"

$(./youtube_dl.sh "$mediaPlayListURL" -o "$title_episode_$MEDIA_ID.mp4")
mv "$MEDIA_ID.mp4" altbalaji_videos/
echo "Download successfully"