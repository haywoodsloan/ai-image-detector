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
  subscription_id = "fd507e5f-043c-4851-b882-8ac289a4c5a4"
  features {}
}

module "bootstrap" {
  source      = "../../../modules/global/bootstrap"
  env_name    = "prod"
  region_name = "eastus2"
}
