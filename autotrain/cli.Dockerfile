FROM huggingface/autotrain-advanced:latest
CMD export HF_USERNAME=$(cat $HF_USER_FILE) && \
  export HF_TOKEN=$(cat $HF_TOKEN_FILE) && \
  pip uninstall -y autotrain-advanced && \
  pip install -U autotrain-advanced && \
  bash