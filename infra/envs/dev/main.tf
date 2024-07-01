terraform {
  required_version = ">= 1.8.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.110.0"
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

data "azurerm_subscription" "current" {}

locals {
  env_name     = "dev"
  region_names = ["eastus2"]
  domain_name  = "ai-image-detector-dev.com"
}

module "rg" {
  source      = "../../modules/envs/rg"
  env_name    = local.env_name
  region_name = local.region_names[0]
}

module "db" {
  source       = "../../modules/envs/db"
  rg_name      = module.rg.env_rg_name
  region_names = local.region_names
}

module "dns" {
  source      = "../../modules/envs/dns"
  env_name    = local.env_name
  rg_name     = module.rg.env_rg_name
  domain_name = local.domain_name
}

module "comm" {
  source      = "../../modules/envs/comm"
  rg_name     = module.rg.env_rg_name
  domain_name = local.domain_name
}

module "frontdoor" {
  source             = "../../modules/envs/frontdoor"
  rg_name            = module.rg.env_rg_name
  function_hostnames = zipmap(keys(module.region), values(module.region)[*].function_hostname)
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
}
