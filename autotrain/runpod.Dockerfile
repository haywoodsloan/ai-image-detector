FROM huggingface/autotrain-advanced:latest
USER 0

ENV PIP_ROOT_USER_ACTION=ignore
ENV HF_HOME="/workspace/.cache"
RUN mkdir -p /workspace/.cache

WORKDIR /home
ENV HOME=/home

RUN conda init
RUN echo "conda activate $CONDA_PREFIX" >> ~/.bash_profile
RUN echo "conda activate $CONDA_PREFIX" >> ~/.bashrc
RUN pip uninstall -y autotrain-advanced && pip install -U autotrain-advanced

ENV NODE_VERSION=20.12.2
ENV NVM_DIR=/home/.nvm
RUN mkdir -p $NVM_DIR
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
RUN source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm use $NODE_VERSION && nvm alias default $NODE_VERSION
ENV PATH="$NVM_DIR/versions/node/v$NODE_VERSION/bin/:$PATH"

ENV CONFIG_TOOL=/home/tools/config
COPY package.json $CONFIG_TOOL/
COPY config/* $CONFIG_TOOL/config/
COPY scripts/compile-configs.js $CONFIG_TOOL/scripts/

RUN npm --prefix $CONFIG_TOOL --production install
RUN echo "npm --prefix $CONFIG_TOOL run compile-autotrain-configs -- --out /workspace" >> ~/.bash_profile
RUN echo "npm --prefix $CONFIG_TOOL run compile-autotrain-configs -- --out /workspace" >> ~/.bashrc

WORKDIR /workspace
CMD pip install -U autotrain-advanced && sleep infinity