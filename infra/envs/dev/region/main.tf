module "rg" {
  source      = "../../../modules/rg"
  env_name    = var.env_name
  region_name = var.region_name
}

module "function" {
  source      = "../../../modules/function"
  env_name    = var.env_name
  region_name = var.region_name
  rg_name     = module.rg.detector_rg_name
  hf_key      = var.hf_key
}
