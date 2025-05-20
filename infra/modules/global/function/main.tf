locals {
  task_type = "image-classification"
  hf_home   = "home/hf_cache"
}
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
  name                = "ai-image-detector-model-${var.env_name}"
  resource_group_name = var.rg_name
  location            = var.region_name

  storage_account_access_key = azurerm_storage_account.function_storage.primary_access_key
  storage_account_name       = azurerm_storage_account.function_storage.name
  service_plan_id            = azurerm_service_plan.function_service_plan.id
  https_only                 = true

  app_settings = {
    MODEL_NAME = var.model_name
    HF_HOME    = local.hf_home
    TASK_TYPE  = local.task_type
  }

  identity {
    type = "SystemAssigned"
  }

  site_config {
    scm_ip_restriction_default_action = "Deny"

    application_insights_connection_string = var.insights_connection_string
    use_32_bit_worker                      = false
    ftps_state                             = "FtpsOnly"
    http2_enabled                          = true

    application_stack {
      python_version = "3.12"
    }

    cors {
      allowed_origins = ["*"]
    }
  }

  lifecycle {
    ignore_changes = [
      app_settings["WEBSITE_RUN_FROM_PACKAGE"],
      app_settings["AzureWebJobsFeatureFlags"],

      tags["hidden-link: /app-insights-conn-string"],
      tags["hidden-link: /app-insights-instrumentation-key"],
      tags["hidden-link: /app-insights-resource-id"]
    ]
  }
}

data "azurerm_function_app_host_keys" "function_keys" {
  name                = azurerm_linux_function_app.function_app.name
  resource_group_name = azurerm_linux_function_app.function_app.resource_group_name
}

resource "azurerm_linux_function_app_slot" "function_app_slot" {
  name            = "staging"
  function_app_id = azurerm_linux_function_app.function_app.id

  storage_account_access_key = azurerm_linux_function_app.function_app.storage_account_access_key
  storage_account_name       = azurerm_linux_function_app.function_app.storage_account_name
  https_only                 = azurerm_linux_function_app.function_app.https_only

  app_settings = azurerm_linux_function_app.function_app.app_settings

  identity {
    type = azurerm_linux_function_app.function_app.identity[0].type
  }

  site_config {
    auto_swap_slot_name           = "production"
    ip_restriction_default_action = "Deny"

    application_insights_connection_string = azurerm_linux_function_app.function_app.site_config[0].application_insights_connection_string
    use_32_bit_worker                      = azurerm_linux_function_app.function_app.site_config[0].use_32_bit_worker
    ftps_state                             = azurerm_linux_function_app.function_app.site_config[0].ftps_state
    http2_enabled                          = azurerm_linux_function_app.function_app.site_config[0].http2_enabled

    application_stack {
      python_version = azurerm_linux_function_app.function_app.site_config[0].application_stack[0].python_version
    }
  }

  lifecycle {
    ignore_changes = [
      app_settings["WEBSITE_RUN_FROM_PACKAGE"],
      app_settings["AzureWebJobsFeatureFlags"],

      tags["hidden-link: /app-insights-conn-string"],
      tags["hidden-link: /app-insights-instrumentation-key"],
      tags["hidden-link: /app-insights-resource-id"]
    ]
  }
}
