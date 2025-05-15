output "function_hostname" {
  value = azurerm_linux_function_app.function_app.default_hostname
}

output "function_key" {
  value = data.azurerm_function_app_host_keys.function_keys.default_function_key
}

