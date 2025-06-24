terraform {
  required_version = ">= 1.8.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.116.0"
    }

    azuread = {
      source  = "hashicorp/azuread"
      version = ">= 3.4.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "tfstate-dev"
    storage_account_name = "tfstatew2uar"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
  }
}

provider "azuread" {
  tenant_id = "27793ea1-7070-4e9b-bd38-47e1f441395f"
}

provider "azurerm" {
  subscription_id = "fd507e5f-043c-4851-b882-8ac289a4c5a4"

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

  domain_name   = "ai-image-detector-dev.com"
  api_subdomain = "api"

  model_name    = "haywoodsloan/ai-image-detector-dev-deploy"
  inference_api = "https://${module.function.function_hostname}/invoke"
  service_api   = "https://${local.api_subdomain}.${local.domain_name}"
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
  env_name     = local.env_name
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

# TODO: restore this once we can afford frontdoor
# module "frontdoor" {
#   source             = "../../modules/global/frontdoor"
#   rg_name            = module.rg.env_rg_name
#   function_hostnames = { for name, region in module.region : name => region.function_hostname }
#   domain_name        = local.domain_name
#   env_name           = local.env_name
#   api_subdomain      = local.api_subdomain
# }

module "insights" {
  source      = "../../modules/global/insights"
  env_name    = local.env_name
  region_name = local.region_names[0]
  rg_name     = module.rg.env_rg_name
  # TODO: add once we can afford the extra cost
  # service_api   = local.service_api
  # inference_api = local.inference_api
  # inference_key = module.function.function_key
}

module "ad" {
  source = "../../modules/global/ad"
}

module "function" {
  source                     = "../../modules/global/function"
  env_name                   = local.env_name
  insights_connection_string = module.insights.insights_connection_string
  model_name                 = local.model_name
  region_name                = local.region_names[0]
  rg_name                    = module.rg.env_rg_name
}

module "region" {
  for_each                   = toset(local.region_names)
  source                     = "./region"
  region_name                = each.value
  env_name                   = local.env_name
  hf_key                     = var.hf_key
  db_id                      = module.db.db_id
  db_name                    = module.db.db_name
  comm_service_id            = module.comm.comm_service_id
  comm_service_endpoint      = module.comm.comm_service_endpoint
  frontdoor_guid             = module.frontdoor.frontdoor_guid
  api_subdomain              = local.api_subdomain
  domain_name                = local.domain_name
  env_rg_name                = module.rg.env_rg_name
  db_role_id                 = module.db.db_role_id
  insights_connection_string = module.insights.insights_connection_string
  inference_api              = local.inference_api
  inference_key              = module.function.function_key
  app_registration_id        = module.ad.app_registration_id
  app_service_principal_id   = module.ad.app_service_principal_id
}
