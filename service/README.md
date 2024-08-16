# AI Image Detector - Service

## Getting Started

### Prerequisites

1. Install [Node 20+](https://nodejs.org/en/download/)

1. To test locally create a file named `local.settings.json` in this directory with this structure:

    ```json
    {
      "IsEncrypted": false,
      "Values": {
        "AzureWebJobsStorage": "UseDevelopmentStorage=true",
        "FUNCTIONS_WORKER_RUNTIME": "node",
        "AzureWebJobsFeatureFlags": "EnableWorkerIndexing",
        "DB_NAME": "<from terraform deployment>",
        "DB_RG_NAME": "<from terraform deployment>",
        "SUB_ID": "<from terraform deployment>",
        "COMM_ENDPOINT": "<from terraform deployment>",
        "PUBSUB_HOSTNAME": "<from terraform deployment>",
        "HF_KEY": "<your Hugging Face access token>",
        "HUB_NAME": "local"
      }
    }
    ```

### Installation

Use `npm install` to install all dependencies

## Usage

### Azure Functions

To run the Azure functions use `npm start`. This will run the function host and Azurite storage emulator.
