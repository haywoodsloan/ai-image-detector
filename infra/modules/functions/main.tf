resource "random_string" "resource_code" {
  length  = 10
  special = false
  upper   = false
}

resource "azurerm_storage_account" "function_storage" {
  name                     = "function${random_string.resource_code.result}"
  resource_group_name      = var.rg_name
  location                 = var.region_name
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_service_plan" "function_service_plan" {
  name                = "function-app-service-plan"
  resource_group_name = var.rg_name
  location            = var.region_name
  os_type             = "Linux"
  sku_name            = "Y1"
}

resource "azurerm_linux_function_app" "function_app" {
  name                = "ai-image-detector-${var.env_name}-${var.region_name}-function-app"
  resource_group_name = var.rg_name
  location            = var.region_name

  storage_account_name       = azurerm_storage_account.function_storage.name
  storage_account_access_key = azurerm_storage_account.function_storage.primary_access_key
  service_plan_id            = azurerm_service_plan.function_service_plan.id

  app_settings = {
    NODE_ENV = var.env_name
    HF_KEY   = var.hf_key
  }

  site_config {
    application_stack {
      node_version = 20
    }
  }
}
