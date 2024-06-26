locals {
  domain = var.env_name == "prod" ? "ai-image-detector.com" : "ai-image-detector-${var.env_name}.com"
}

resource "azurerm_dns_zone" "dns" {
  name                = local.domain
  resource_group_name = var.rg_name
}

