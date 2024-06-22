terraform {
  required_version = ">= 1.8.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.109.0"
    }
  }

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
  source   = "./eastus2"
  env_name = var.env_name
  hf_key   = var.hf_key
}

module "db" {
  source       = "../../modules/db"
  env_name     = var.env_name
  region_names = ["eastus2"]
  rg_name      = module.eastus2.rg_name
  rg_location  = module.eastus2.rg_location
}
