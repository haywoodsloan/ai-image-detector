resource "azurerm_resource_group" "db_rg" {
  name     = "ai-image-detector-${var.env_name}-db"
  location = "eastus2"
}

resource "random_string" "resource_code" {
  length  = 10
  special = false
  upper   = false
}

resource "azurerm_cosmosdb_account" "cosmos_account" {
  name                = "cosmos-db-${var.env_name}-${random_string.resource_code.result}"
  location            = azurerm_resource_group.db_rg.location
  resource_group_name = azurerm_resource_group.db_rg.name
  free_tier_enabled   = true
  offer_type          = "Standard"
  kind                = "MongoDB"

  consistency_policy {
    consistency_level = "Strong"
  }

  dynamic "geo_location" {
    for_each = var.region_names
    content {
      location          = geo_location.value
      failover_priority = geo_location.key
    }
  }
}

resource "azurerm_cosmosdb_mongo_database" "mongo_db" {
  name                = "cosmos-mongo-db"
  resource_group_name = azurerm_resource_group.db_rg.name
  account_name        = azurerm_cosmosdb_account.cosmos_account.name
}
