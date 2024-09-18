FROM pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime

ENV DEBIAN_FRONTEND=noninteractive
ENV HF_HUB_ENABLE_HF_TRANSFER=1
ENV PIP_ROOT_USER_ACTION=ignore
ENV PYTHONUNBUFFERED=1
ENV HOME=/workspace

RUN apt-get update
RUN apt-get install -y build-essential cmake git git-lfs libgl1 libglib2.0-0 libaio-dev
RUN apt-get upgrade -y
RUN apt-get autoremove && apt-get autoclean && apt-get clean

RUN git lfs install
ENV CUTLASS_PATH="$HOME/cutlass"
RUN git clone --depth 1 --branch v3.5.0 https://github.com/NVIDIA/cutlass.git "$CUTLASS_PATH"

RUN conda install -y nvidia/label/cuda-12.1.1::cuda-nvcc
RUN conda install -y xformers::xformers
RUN conda clean -y --all

ENV HF_HOME="$HOME/.cache"
RUN pip install -U autotrain-advanced
RUN python -m nltk.downloader punkt
RUN pip install -U flash-attn --no-build-isolation
RUN pip install -U deepspeed
RUN pip install --upgrade --force-reinstall --no-cache-dir "unsloth[cu121-ampere-torch230] @ git+https://github.com/unslothai/unsloth.git" --no-deps
RUN pip cache purge

RUN echo 'export HF_USERNAME=$(cat $HF_USER_FILE)' >> ~/.bashrc
RUN echo 'export HF_TOKEN=$(cat $HF_TOKEN_FILE)' >> ~/.bashrc

CMD export HF_USERNAME=$(cat $HF_USER_FILE) && \
  export HF_TOKEN=$(cat $HF_TOKEN_FILE) && \
  pip install -U autotrain-advanced && \
  git config --global url."https://$HF_USERNAME:$HF_TOKEN@huggingface.co/".insteadOf "https://huggingface.co/" && \
  (git -C haywoodsloan/ai-images fetch && git -C haywoodsloan/ai-images reset origin/main --hard) || \
  git clone https://huggingface.co/datasets/haywoodsloan/ai-images haywoodsloan/ai-images && \
  bash