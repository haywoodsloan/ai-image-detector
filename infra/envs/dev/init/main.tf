terraform {
  required_version = ">= 1.8.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.110.0"
    }
  }
}

provider "azurerm" {
  features {}
}

module "bootstrap" {
  source   = "../../../modules/envs/bootstrap"
  env_name = "dev"
  region_name = "eastus2"
}
