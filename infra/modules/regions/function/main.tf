resource "random_string" "resource_code" {
  length  = 5
  special = false
  upper   = false
}

resource "azurerm_storage_account" "function_storage" {
  name                     = "functionstore${random_string.resource_code.result}"
  resource_group_name      = var.rg_name
  location                 = var.region_name
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_service_plan" "function_service_plan" {
  name                = "function-service-plan"
  resource_group_name = var.rg_name
  location            = var.region_name
  os_type             = "Linux"
  sku_name            = "Y1"
}

resource "azurerm_linux_function_app" "function_app" {
  name                = "ai-image-detector-${var.env_name}-${var.region_name}"
  resource_group_name = var.rg_name
  location            = var.region_name

  storage_account_access_key = azurerm_storage_account.function_storage.primary_access_key
  storage_account_name       = azurerm_storage_account.function_storage.name
  service_plan_id            = azurerm_service_plan.function_service_plan.id

  identity {
    type = "SystemAssigned"
  }

  app_settings = {
    NODE_ENV      = var.env_name
    HF_KEY        = var.hf_key
    DB_CONN_STR   = var.db_connection_string
    DB_CONN_STR_2 = var.db_secondary_connection_string
  }

  site_config {
    application_stack {
      node_version = 20
    }
  }
}

data "azurerm_function_app_host_keys" "function_keys" {
  name                = azurerm_linux_function_app.function_app.name
  resource_group_name = var.rg_name
}
