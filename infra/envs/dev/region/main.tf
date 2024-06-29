module "rg" {
  source      = "../../../modules/regions/rg"
  env_name    = var.env_name
  region_name = var.region_name
}

module "insights" {
  source      = "../../../modules/regions/insights"
  env_name    = var.env_name
  region_name = var.region_name
  rg_name     = module.rg.region_rg_name
}

module "pubsub" {
  source      = "../../../modules/regions/pubsub"
  region_name = var.region_name
  rg_name     = module.rg.region_rg_name
}

module "function" {
  source                         = "../../../modules/regions/function"
  env_name                       = var.env_name
  region_name                    = var.region_name
  rg_name                        = module.rg.region_rg_name
  insights_connection_string     = module.insights.insights_connection_string
  hf_key                         = var.hf_key
  db_connection_string           = var.db_connection_string
  db_secondary_connection_string = var.db_secondary_connection_string
  comm_service_endpoint          = var.comm_service_endpoint
  comm_service_id                = var.comm_service_id
  frontdoor_guid                 = var.frontdoor_guid
  api_subdomain                  = var.api_subdomain
  domain_name                    = var.domain_name
  env_rg_name                    = var.env_rg_name
  pubsub_endpoint                = module.pubsub.pubsub_endpoint
}
