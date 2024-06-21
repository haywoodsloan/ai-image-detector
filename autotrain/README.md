# AI Image Detector - Autotrain

## Getting Started

### Prerequisites

> [!IMPORTANT]
> Autotrain only supports NVIDIA GPUs currently. AMD or Intel GPUs will fallback to the CPU with reduced performance.

To run Autotrain locally:

1. Install [Node 20+](https://nodejs.org/en/download/)
  
1. Install [Docker Desktop](https://docs.docker.com/guides/getting-started/get-docker-desktop/)

1. Create a file named `.huggingface_key` in this directory, containing your Hugging Face access token

1. Create a file named `.huggingface_user` in this directory, containing your Hugging Face username

### Installation

Use `npm install` to install dependencies

## Usage

### Autotrain CLI

To open the Autotrain CLI use `npm run open-autotrain-cli`. This will build and watch the configs then start the docker container (will rebuild if the Dockerfile is changed).

To immediately run a command on the Autotrain CLI once it starts use `npm run run-autotrain-cli -- <command>`. This will not keep the shell open once the command completes.

### Clean and Rebuild Autotrain CLI

To rebuild a clean version of the Autotrain CLI use `npm run recreate-autotrain-cli`. This will rebuild the docker container and start it.

### Autotrain GUI

To open the Autotrain GUI use `npm run start-open-autotrain-app`. This will build and watch the configs, start the docker container (will rebuild if the Dockerfile is changed), then open the GUI in your browser.
