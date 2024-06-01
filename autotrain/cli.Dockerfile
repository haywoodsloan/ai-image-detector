FROM pytorch/pytorch:2.3.0-cuda12.1-cudnn8-runtime

ENV DEBIAN_FRONTEND=noninteractive
ENV HF_HUB_ENABLE_HF_TRANSFER=1
ENV PIP_ROOT_USER_ACTION=ignore
ENV PYTHONUNBUFFERED=1
ENV HOME=/workspace

RUN apt-get update
RUN apt-get install -y git git-lfs libgl1 libglib2.0-0
RUN apt-get upgrade -y
RUN apt-get autoremove && apt-get autoclean && apt-get clean

RUN git lfs install
RUN mkdir /workspace/.cache
ENV HF_HOME="/workspace/.cache"

RUN conda install -y nvidia/label/cuda-12.1.1::cuda-nvcc
RUN conda install -y xformers::xformers

RUN pip install -U autotrain-advanced
RUN python -m nltk.downloader punkt
RUN pip install -U flash-attn --no-build-isolation
RUN pip install -U deepspeed

RUN conda clean --all

RUN echo 'export HF_USERNAME=$(cat $HF_USER_FILE)' >> ~/.bashrc
RUN echo 'export HF_TOKEN=$(cat $HF_TOKEN_FILE)' >> ~/.bashrc

CMD pip install -U autotrain-advanced && bash