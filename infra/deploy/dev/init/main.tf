terraform {
  required_version = ">= 1.8.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.116.0"
    }
  }
}

provider "azurerm" {
  features {}
}

module "bootstrap" {
  source      = "../../../modules/global/bootstrap"
  env_name    = "dev"
  region_name = "eastus2"
}
