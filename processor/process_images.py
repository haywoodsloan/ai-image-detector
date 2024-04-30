from dotenv import dotenv_values
from datasets import load_dataset
from os import path
from termcolor import colored
from time import sleep

REQUEST_ERROR_DELAY = 15
RETRY_LIMIT = 5


def with_retry(func, retry_count=0):
    try:
        return func()
    except Exception as ex:
        if retry_count < RETRY_LIMIT:
            print(colored(f"Retrying after error: {str(ex)}", "red"))
            sleep(REQUEST_ERROR_DELAY)
            return with_retry(func, retry_count + 1)
        else:
            raise


settings_path = path.join(path.dirname(__file__), "settings.local")
hf_key = dotenv_values(settings_path)["HF_KEY"]

cache_path = path.join(path.dirname(__file__), ".cache")
dataset = with_retry(
    lambda: load_dataset(
        "haywoodsloan/ai-images",
        data_files={"train": ["raw/artificial/*", "raw/human/*"]},
        split="train",
        drop_labels=False,
        cache_dir=cache_path,
        verification_mode="no_checks",
        token=hf_key,
    )
)

dataset = dataset.train_test_split(test_size=0.1, seed=42)
with_retry(
    lambda: dataset.push_to_hub(
        "haywoodsloan/ai-images", data_dir="converted", token=hf_key
    )
)

print(colored("Done!", "yellow"))
