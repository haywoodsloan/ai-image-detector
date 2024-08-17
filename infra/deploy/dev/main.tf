terraform {
  required_version = ">= 1.8.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.116.0"
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
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}

data "azurerm_subscription" "current" {}

locals {
  env_name     = "dev"
  region_names = ["eastus2"]
  domain_name  = "ai-image-detector-dev.com"
}

module "rg" {
  source      = "../../modules/global/rg"
  env_name    = local.env_name
  region_name = local.region_names[0]
}

module "db" {
  source       = "../../modules/global/db"
  rg_name      = module.rg.env_rg_name
  region_names = local.region_names
}

module "dns" {
  source      = "../../modules/global/dns"
  env_name    = local.env_name
  rg_name     = module.rg.env_rg_name
  domain_name = local.domain_name
}

module "comm" {
  source      = "../../modules/global/comm"
  rg_name     = module.rg.env_rg_name
  domain_name = local.domain_name
}

module "frontdoor" {
  source             = "../../modules/global/frontdoor"
  rg_name            = module.rg.env_rg_name
  function_hostnames = { for name, region in module.region : name => region.function_hostname }
  domain_name        = local.domain_name
  env_name           = local.env_name
}

module "region" {
  for_each              = toset(local.region_names)
  source                = "./region"
  region_name           = each.value
  env_name              = local.env_name
  hf_key                = var.hf_key
  db_id                 = module.db.db_id
  db_name               = module.db.db_name
  comm_service_id       = module.comm.comm_service_id
  comm_service_endpoint = module.comm.comm_service_endpoint
  frontdoor_guid        = module.frontdoor.frontdoor_guid
  api_subdomain         = module.frontdoor.api_subdomain
  domain_name           = local.domain_name
  env_rg_name           = module.rg.env_rg_name
  db_role_id            = module.db.db_role_id
}
