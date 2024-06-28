resource "random_string" "resource_code" {
  length  = 5
  special = false
  upper   = false
}

resource "azurerm_cosmosdb_account" "cosmos_account" {
  name                = "cosmos-db-${random_string.resource_code.result}"
  location            = var.region_names[0]
  resource_group_name = var.rg_name
  free_tier_enabled   = true
  offer_type          = "Standard"
  kind                = "MongoDB"

  capabilities {
    name = "EnableMongo"
  }

  capabilities {
    name = "mongoEnableDocLevelTTL"
  }

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
  name                = "service"
  resource_group_name = var.rg_name
  account_name        = azurerm_cosmosdb_account.cosmos_account.name
  throughput          = 1000
}
