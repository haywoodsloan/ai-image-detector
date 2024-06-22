output "function_hostname" {
  value = azurerm_linux_function_app.function_app.default_hostname
}

output "function_principal_id" {
  value = azurerm_linux_function_app.function_app.identity[0].principal_id
}