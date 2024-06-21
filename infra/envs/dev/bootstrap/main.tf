provider "azurerm" {
  features {}
}

module "bootstrap" {
  source      = "../../../modules/bootstrap"
  env_name    = "dev"
}
