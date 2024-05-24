FROM huggingface/autotrain-advanced:latest

RUN pip uninstall -y autotrain-advanced
RUN pip install -U autotrain-advanced

RUN echo 'export HF_USERNAME=$(cat $HF_USER_FILE)' >> ~/.bashrc
RUN echo 'export HF_TOKEN=$(cat $HF_TOKEN_FILE)' >> ~/.bashrc

CMD bash