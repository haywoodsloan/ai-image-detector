# Configure the Azure provider
terraform {
  backend "azurerm" {
    resource_group_name  = "tfstate-dev"
    storage_account_name = "tfstateubai7bcvn9"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
  }
}

provider "azurerm" {
  features {}
}

module "eastus2" {
  source = "./eastus2"
  env_name = var.env_name
  hf_key = var.hf_key
}
