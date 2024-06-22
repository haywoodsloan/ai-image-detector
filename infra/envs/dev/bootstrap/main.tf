terraform {
  required_version = ">= 1.8.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.109.0"
    }
  }
}

provider "azurerm" {
  features {}
}

module "bootstrap" {
  source   = "../../../modules/bootstrap"
  env_name = "dev"
}
