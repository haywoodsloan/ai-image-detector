locals {
  api_endpoints = [
    "auth",
    "imageAnalysis",
    "imageVote",
    "verifyAuth"
  ]
}
resource "azurerm_log_analytics_workspace" "workspace" {
  name                = "analytics-workspace"
  resource_group_name = var.rg_name
  location            = var.region_name
}

resource "azurerm_application_insights" "insights" {
  name                = "app-insights"
  resource_group_name = var.rg_name
  location            = var.region_name

  workspace_id     = azurerm_log_analytics_workspace.workspace.id
  application_type = "Node.JS"

  daily_data_cap_in_gb = 0.4
  sampling_percentage  = 10
}

# TODO: add once we can afford the extra cost
# resource "azurerm_application_insights_standard_web_test" "model_test" {
#   name    = "invoke"
#   enabled = true

#   resource_group_name = var.rg_name
#   location            = var.region_name

#   application_insights_id = azurerm_application_insights.insights.id
#   frequency               = 900
#   geo_locations           = ["us-va-ash-azr"]

#   request {
#     url       = "${var.inference_api}?code=${var.inference_key}"
#     http_verb = "OPTIONS"
#   }
# }
# resource "azurerm_application_insights_standard_web_test" "api_test" {
#   for_each = toset(local.api_endpoints)

#   name    = each.value
#   enabled = true

#   resource_group_name = var.rg_name
#   location            = var.region_name

#   application_insights_id = azurerm_application_insights.insights.id
#   frequency               = 900
#   geo_locations           = ["us-va-ash-azr"]

#   request {
#     url       = "${var.service_api}/${each.value}"
#     http_verb = "OPTIONS"
#   }
# }
