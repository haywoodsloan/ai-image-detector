# AI Image Detector - Service

## Getting Started

### Prerequisites

1. Install [Node 20+](https://nodejs.org/en/download/)

1. To test locally create a file named `local.settings.json` in this directory with this structure:

    ```json
    {
      "Values": {
        "hfKey": "<your Hugging Face access token>"
      }
    }
    ```

### Installation

Use `npm install` to install all dependencies

## Usage

### Azure Functions

To run the Azure functions use `npm start`. This will run the function host and Azurite storage emulator.

### Detector Model Demo

To run a demo of the detector model use `npm run demo`.
