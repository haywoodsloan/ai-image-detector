output "function_hostname" {
  value = azurerm_windows_function_app.function_app.default_hostname
}

output "function_slot_hostname" {
  value = azurerm_windows_function_app_slot.function_app_slot.default_hostname
}