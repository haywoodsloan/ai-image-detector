data "azurerm_client_config" "current" {}

resource "azurerm_service_plan" "container_service_plan" {
  name                = "container-service-plan"
  resource_group_name = var.rg_name
  location            = var.region_name

  os_type      = "Linux"
  sku_name     = "P1v3"
  worker_count = 1

  # premium_plan_auto_scale_enabled = true
  # maximum_elastic_worker_count    = 2
}

resource "azurerm_linux_web_app" "service_app" {
  name                = "ai-image-detector-model-${var.env_name}"
  resource_group_name = var.rg_name
  location            = var.region_name

  service_plan_id = azurerm_service_plan.container_service_plan.id
  https_only      = true

  app_settings = {
    MODEL_NAME                            = var.model_name
    APPLICATIONINSIGHTS_CONNECTION_STRING = var.insights_connection_string
  }

  identity {
    type = "SystemAssigned"
  }

  auth_settings_v2 {
    require_authentication = true
    require_https          = true

    auth_enabled           = true
    unauthenticated_action = "Return401"

    login {}
    active_directory_v2 {
      client_id            = var.app_registration_id
      tenant_auth_endpoint = "https://login.microsoftonline.com/${data.azurerm_client_config.current.tenant_id}/v2.0/"
    }
  }

  site_config {
    use_32_bit_worker = false
    ftps_state        = "FtpsOnly"
    http2_enabled     = true

    application_stack {
      docker_image_name   = "haywoodsloan/hf-inference:latest"
      docker_registry_url = "https://index.docker.io"
    }

    cors {
      allowed_origins = ["*"]
    }
  }

  lifecycle {
    ignore_changes = [
      tags["hidden-link: /app-insights-resource-id"]
    ]
  }
}
