resource "azurerm_log_analytics_workspace" "workspace" {
  name                = "analytics-workspace"
  resource_group_name = var.rg_name
  location            = var.region_name
}

resource "azurerm_application_insights" "insights" {
  name                = "app-insights"
  resource_group_name = var.rg_name
  location            = var.region_name
  workspace_id        = azurerm_log_analytics_workspace.workspace.id
  application_type    = "Node.JS"
}
