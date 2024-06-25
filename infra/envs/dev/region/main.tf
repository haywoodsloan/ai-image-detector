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

module "function" {
  source                                   = "../../../modules/regions/function"
  env_name                                 = var.env_name
  region_name                              = var.region_name
  rg_name                                  = module.rg.region_rg_name
  insights_connection_string               = module.insights.insights_connection_string
  hf_key                                   = var.hf_key
  db_connection_string                     = var.db_connection_string
  db_secondary_connection_string           = var.db_secondary_connection_string
  comm_service_connection_string           = var.comm_service_connection_string
  comm_service_secondary_connection_string = var.comm_service_secondary_connection_string
}
