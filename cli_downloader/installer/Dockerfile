FROM subhajit2tanay/ffmpegdocker:latest

RUN apt-get update

RUN apt-get install -y jq
RUN apt-get install -y libssl-dev
RUN apt-get install -y curl

ADD cli_downloader.bash /home/downloader.bash

RUN chmod +x /home/downloader.bash

ENTRYPOINT ["/bin/bash"]
CMD ["/home/downloader.bash"]

# provide voot video url