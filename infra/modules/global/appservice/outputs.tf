output "appservice_hostname" {
  value = azurerm_linux_web_app.service_app.default_hostname
}
