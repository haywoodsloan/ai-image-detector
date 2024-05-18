FROM huggingface/autotrain-advanced:latest
RUN pip uninstall -y autotrain-advanced
RUN pip install -U autotrain-advanced
CMD export HF_USERNAME=$(cat $HF_USER_FILE) && \
  export HF_TOKEN=$(cat $HF_TOKEN_FILE) && \
  bash