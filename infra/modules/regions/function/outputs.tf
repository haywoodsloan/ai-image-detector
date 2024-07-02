output "function_hostname" {
  value = azurerm_windows_function_app.function_app.default_hostname
}

output "function_slot_hostname" {
  value = var.env_name == "prod" ? azurerm_windows_function_app_slot.function_app_slot[0].default_hostname : null
}

output "function_keys" {
  value = data.azurerm_function_app_host_keys.function_keys
}
