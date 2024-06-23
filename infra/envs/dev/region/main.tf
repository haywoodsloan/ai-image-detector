module "rg" {
  source      = "../../../modules/regions/rg"
  env_name    = var.env_name
  region_name = var.region_name
}

module "function" {
  source                         = "../../../modules/regions/function"
  env_name                       = var.env_name
  region_name                    = var.region_name
  rg_name                        = module.rg.region_rg_name
  hf_key                         = var.hf_key
  db_connection_string           = var.db_connection_string
  db_secondary_connection_string = var.db_secondary_connection_string
}
