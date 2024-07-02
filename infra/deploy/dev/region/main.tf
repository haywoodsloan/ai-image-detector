module "rg" {
  source      = "../../../modules/regional/rg"
  env_name    = var.env_name
  region_name = var.region_name
}

module "insights" {
  source      = "../../../modules/regional/insights"
  env_name    = var.env_name
  region_name = var.region_name
  rg_name     = module.rg.region_rg_name
}

module "pubsub" {
  source      = "../../../modules/regional/pubsub"
  region_name = var.region_name
  rg_name     = module.rg.region_rg_name
}

module "function" {
  source                     = "../../../modules/regional/function"
  env_name                   = var.env_name
  region_name                = var.region_name
  rg_name                    = module.rg.region_rg_name
  insights_connection_string = module.insights.insights_connection_string
  hf_key                     = var.hf_key
  db_id                      = var.db_id
  db_name                    = var.db_name
  db_role_id                 = var.db_role_id
  comm_service_endpoint      = var.comm_service_endpoint
  comm_service_id            = var.comm_service_id
  frontdoor_guid             = var.frontdoor_guid
  api_subdomain              = var.api_subdomain
  domain_name                = var.domain_name
  env_rg_name                = var.env_rg_name
  pubsub_hostname            = module.pubsub.pubsub_hostname
  pubsub_id                  = module.pubsub.pubsub_id
}
