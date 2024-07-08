FROM pytorch/pytorch:2.3.0-cuda12.1-cudnn8-runtime

ENV DEBIAN_FRONTEND=noninteractive
ENV HF_HUB_ENABLE_HF_TRANSFER=1
ENV PIP_ROOT_USER_ACTION=ignore
ENV PYTHONUNBUFFERED=1

WORKDIR /home
ENV HOME="/home"

ENV HF_HOME="$HOME/.cache"
RUN mkdir -p $HF_HOME

RUN apt-get update
RUN apt-get install -y build-essential cmake git git-lfs libgl1 libglib2.0-0 libaio-dev tmux curl
RUN apt-get upgrade -y
RUN apt-get autoremove && apt-get autoclean && apt-get clean

RUN git lfs install
RUN git clone --depth 1 --branch v3.5.0 https://github.com/NVIDIA/cutlass.git $HOME/cutlass
ENV CUTLASS_PATH="$HOME/cutlass"

ENV NODE_VERSION=20.12.2
ENV NVM_DIR="$HOME/.nvm"
RUN mkdir -p $NVM_DIR
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
RUN . "$NVM_DIR/nvm.sh" && nvm install $NODE_VERSION && nvm use $NODE_VERSION && nvm alias default $NODE_VERSION
ENV PATH="$NVM_DIR/versions/node/v$NODE_VERSION/bin/:$PATH"

RUN conda install -y nvidia/label/cuda-12.1.1::cuda-nvcc
RUN conda install -y xformers::xformers
RUN conda clean -y --all

RUN pip install -U autotrain-advanced
RUN python -m nltk.downloader punkt
RUN pip install -U flash-attn --no-build-isolation
RUN pip install -U deepspeed
RUN pip cache purge

ENV CONFIG_TOOL="$HOME/tools/config"
COPY package.json $CONFIG_TOOL/
COPY config/ $CONFIG_TOOL/config/
COPY scripts/compile-configs.js $CONFIG_TOOL/scripts/

RUN npm --prefix $CONFIG_TOOL --production install
RUN echo "npm --prefix $CONFIG_TOOL run compile-autotrain-configs -- --out /workspace && echo" >> ~/.bash_profile
RUN echo "npm --prefix $CONFIG_TOOL run compile-autotrain-configs -- --out /workspace && echo" >> ~/.bashrc

WORKDIR /workspace
CMD pip install -U autotrain-advanced && sleep infinity