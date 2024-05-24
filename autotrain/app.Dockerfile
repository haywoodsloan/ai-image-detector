FROM huggingface/autotrain-advanced:latest

RUN pip uninstall -y autotrain-advanced
RUN pip install -U autotrain-advanced

CMD export HF_TOKEN=$(cat $HF_TOKEN_FILE) && \
  autotrain app --host 0.0.0.0 --port 7860 --workers 1
