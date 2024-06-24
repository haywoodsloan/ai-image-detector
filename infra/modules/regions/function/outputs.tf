output "function_hostname" {
  value = azurerm_windows_function_app.function_app.default_hostname
}

output "function_keys" {
  value = data.azurerm_function_app_host_keys.function_keys
}