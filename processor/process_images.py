from dotenv import dotenv_values
from datasets import load_dataset
from os import path

settings_path = path.join(path.dirname(__file__), "settings.local")
hf_key = dotenv_values(settings_path)["HF_KEY"]

cache_path = path.join(path.dirname(__file__), ".cache")
dataset = load_dataset(
    "haywoodsloan/ai-images",
    data_files={"train": ["raw/artificial/*", "raw/human/*"]},
    split="train",
    drop_labels=False,
    cache_dir=cache_path,
    verification_mode="no_checks",
    token=hf_key,
)

dataset = dataset.train_test_split(test_size=0.1, seed=42)
dataset.push_to_hub("haywoodsloan/ai-images", data_dir="converted", token=hf_key)
