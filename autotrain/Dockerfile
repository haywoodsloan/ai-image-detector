FROM huggingface/autotrain-advanced:latest
CMD export HF_TOKEN=$(cat $HF_TOKEN_FILE) && \
  pip uninstall -y autotrain-advanced && \
  pip install -U autotrain-advanced && \
  autotrain app --host 0.0.0.0 --port 7860 --workers 1
