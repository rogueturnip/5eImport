# [Choice] Node.js version (use -bullseye variants on local arm64/Apple Silicon): 18, 16, 14, 18-bullseye, 16-bullseye, 14-bullseye, 18-buster, 16-buster, 14-buster
ARG VARIANT
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:0-${VARIANT}

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends git-core bash-completion


COPY ./history /home/node/.bash_history

COPY ./profile /home/node/.bash_profile

COPY ./inputrc /home/node/.inputrc

COPY ./aliases /home/node/.bash_aliases
RUN alias

RUN echo $VARIANT
