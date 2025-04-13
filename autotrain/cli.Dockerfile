FROM pytorch/pytorch:2.6.0-cuda12.6-cudnn9-devel AS base

ENV DEBIAN_FRONTEND=noninteractive
ENV HF_HUB_ENABLE_HF_TRANSFER=1
ENV PIP_ROOT_USER_ACTION=ignore
ENV PYTHONUNBUFFERED=1
ENV HOME=/workspace

RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install -y build-essential cmake curl ca-certificates gcc locales net-tools wget libpq-dev \
  libsndfile1-dev unzip git git-lfs libgl1 libglib2.0-0 libaio-dev libjpeg-dev libpng-dev libgomp1
RUN apt-get autoremove && apt-get autoclean && apt-get clean

RUN git lfs install
ENV CUTLASS_PATH="$HOME/cutlass"
RUN git clone --depth 1 --branch v3.7.0 https://github.com/NVIDIA/cutlass.git "$CUTLASS_PATH"

ENV HF_HOME="$HOME/.cache"
RUN pip install -U nvidia-pyindex
RUN pip install -U nvidia-cuda-nvcc-cu12
RUN pip install -U xformers --index-url https://download.pytorch.org/whl/cu126
RUN pip install -U autotrain-advanced
RUN python -m nltk.downloader punkt
RUN pip install -U ninja
RUN pip install -U flash-attn --no-build-isolation
RUN pip install -U deepspeed
RUN pip install --upgrade --force-reinstall --no-cache-dir "unsloth[cu126-ampere-torch260] @ git+https://github.com/unslothai/unsloth.git" --no-deps

# Create an image for local training on the command line
FROM base AS cli

RUN echo 'export HF_USERNAME=$(cat $HF_USER_FILE)' >> ~/.bashrc
RUN echo 'export HF_TOKEN=$(cat $HF_TOKEN_FILE)' >> ~/.bashrc

CMD export HF_USERNAME=$(cat $HF_USER_FILE) && \
  export HF_TOKEN=$(cat $HF_TOKEN_FILE) && \
  pip install -U autotrain-advanced && \
  git config --global url."https://$HF_USERNAME:$HF_TOKEN@huggingface.co/".insteadOf "https://huggingface.co/" && \
  (git -C haywoodsloan/ai-images fetch && git -C haywoodsloan/ai-images reset origin/main --hard) || \
  git clone https://huggingface.co/datasets/haywoodsloan/ai-images haywoodsloan/ai-images && \
  bash

# Create a secondary image that immediately starts training
FROM cli AS quick

CMD export HF_USERNAME=$(cat $HF_USER_FILE) && \
  export HF_TOKEN=$(cat $HF_TOKEN_FILE) && \
  pip install -U autotrain-advanced && \
  git config --global url."https://$HF_USERNAME:$HF_TOKEN@huggingface.co/".insteadOf "https://huggingface.co/" && \
  (git -C haywoodsloan/ai-images fetch && git -C haywoodsloan/ai-images reset origin/main --hard) || \
  git clone https://huggingface.co/datasets/haywoodsloan/ai-images haywoodsloan/ai-images && \
  autotrain --config configs/haywoodsloan/ai-image-detector-deploy.yml

# Create an image that can be used on the cloud
FROM base AS runpod

ENV HOME="/home"
ENV HF_HOME="$HOME/.cache"
RUN mkdir -p $HF_HOME

ENV NODE_VERSION=22.13.0
ENV NVM_DIR="$HOME/.nvm"
RUN mkdir -p $NVM_DIR
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
RUN . "$NVM_DIR/nvm.sh" && nvm install $NODE_VERSION && nvm use $NODE_VERSION && nvm alias default $NODE_VERSION
ENV PATH="$NVM_DIR/versions/node/v$NODE_VERSION/bin/:$PATH"

ENV CONFIG_TOOL="$HOME/tools/config"
COPY package.json $CONFIG_TOOL/
RUN npm --prefix $CONFIG_TOOL --production install

COPY configs/ $CONFIG_TOOL/configs/
COPY scripts/compile-configs.js $CONFIG_TOOL/scripts/

WORKDIR /workspace
CMD pip install -U autotrain-advanced && \
  rm -f haywoodsloan/ai-images/.git/index.lock && \
  git config --global url."https://$HF_USERNAME:$HF_TOKEN@huggingface.co/".insteadOf "https://huggingface.co/" && \
  (git -C haywoodsloan/ai-images fetch && git -C haywoodsloan/ai-images reset origin/main --hard) || \
  git clone https://huggingface.co/datasets/haywoodsloan/ai-images haywoodsloan/ai-images && \
  npm --prefix $CONFIG_TOOL run compile-autotrain-configs -- --out /workspace && \
  autotrain --config configs/haywoodsloan/ai-image-detector-deploy.yml && \
  runpodctl stop pod $RUNPOD_POD_ID