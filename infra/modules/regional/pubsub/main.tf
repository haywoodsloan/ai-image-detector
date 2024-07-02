resource "random_string" "resource_code" {
  length  = 5
  special = false
  upper   = false
}

resource "azurerm_web_pubsub" "pubsub" {
  name                = "pubsub-${random_string.resource_code.result}"
  location            = var.region_name
  resource_group_name = var.rg_name

  sku      = "Free_F1"
  capacity = 1

  aad_auth_enabled = true
}

resource "azurerm_web_pubsub_hub" "verification_hub" {
  name          = "verifications"
  web_pubsub_id = azurerm_web_pubsub.pubsub.id
}
