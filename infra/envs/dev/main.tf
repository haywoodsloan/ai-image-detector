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

module "region" {
  for_each = var.region_names
  source   = "./region"
  region_name = each.value
  env_name = var.env_name
  hf_key   = var.hf_key
}

module "db" {
  source       = "../../modules/db"
  env_name     = var.env_name
  region_names = var.region_names
}
