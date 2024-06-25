resource "azurerm_dns_zone" "dns" {
  name                = "ai-image-detector-${var.env_name}.com"
  resource_group_name = var.rg_name
}

