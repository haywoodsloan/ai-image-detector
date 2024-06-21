module "rgs" {
  source      = "../../../modules/rgs"
  env_name    = var.env_name
  region_name = var.region_name
}

module "functions" {
  source      = "../../../modules/functions"
  env_name    = var.env_name
  region_name = var.region_name
  rg_name     = module.rgs.ai_image_detector_rg_name
  hf_key      = var.hf_key
}
