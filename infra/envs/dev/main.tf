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
    storage_account_name = "tfstatew2uar"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
  }
}

provider "azurerm" {
  features {}
}

module "rg" {
  source      = "../../modules/envs/rg"
  env_name    = var.env_name
  region_name = var.region_names[0]
}

module "db" {
  source       = "../../modules/envs/db"
  env_name     = var.env_name
  rg_name      = module.rg.env_rg_name
  region_names = var.region_names
}


module "region" {
  for_each                       = toset(var.region_names)
  source                         = "./region"
  region_name                    = each.value
  env_name                       = var.env_name
  hf_key                         = var.hf_key
  db_connection_string           = module.db.connection_string
  db_secondary_connection_string = module.db.secondary_connection_string
}
