# AI Image Detector - Scrapper

## Getting Started

### Prerequisites

1. Install [Node 20+](https://nodejs.org/en/download/)

1. To test locally create a file named `local.settings.json` in this directory with this structure:

    ```json
    {
      "Values": {
        "HF_KEY": "<your Hugging Face access token>",
        "PEXELS_KEY": "<your Pexels access token>"
      }
    }
    ```

### Installation

Use `npm install` to install all dependencies

## Usage

### Scrape Reddit

To run a single scrape of AI images use `npm start`.

To scrape real images use `npm start -- --real`

### Continuous Scrape

To run a continuous scrape loop of both AI and real images use `npm run loop`. This will perform a scrape of both images types each hour.
