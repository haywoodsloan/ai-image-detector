# AI Image Detector - Infrastructure

## Getting Started

### Prerequisites

To deploy to Azure:

1. Install [Terraform](https://developer.hashicorp.com/terraform/install)
  
1. Install [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli#install)

1. Authenticate the Azure CLI using `az login`, make sure to select the subscription you want to deploy to.

1. Create a `terraform.tfvars` file in the deployment folder, i.e. `infra/deploy/<env name>/terraform.tfvars`. The contents should be:

   ```terraform
   hf_key = "<your HuggingFace key>"
   ```

### Installation

#### New Environments

For a new environment use the `terraform init` command from the `init` folder, i.e. `infra/deploy/<env name>/init`.

#### Existing Environments

For an existing environment use the command `terraform init` from the deployment folder, i.e. `infra/deploy/<env name>`.

## Usage

### Init New Environments

For a new environment use the `terraform apply` command from the `init` folder. This will initialize the Azure storage account that will track the terraform state for future deployments.

The apply will outputs a `state_storage_account_name`. Take this value and add it to `infra/deploy/<env name>/main.tf`. Update the following block:

```terraform
terraform {
  ...
  backend "azurerm" {
    ...
    storage_account_name = "<update this value>"
  }
}
```

Next, follow the installation and usage steps for an existing environment to deploy the service components.

### Deploy Existing Environments

For an existing environment use the `terraform apply` command from the `<env name>` folder. This will deploy the services components using the Azure storage account to track the state.
