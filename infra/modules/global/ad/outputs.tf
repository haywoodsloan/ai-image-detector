output "app_registration_id" {
  value = azuread_application_registration.app_registration.client_id
}

output "app_service_principal_id" {
  value = azuread_service_principal.app_service_principal.object_id
}
