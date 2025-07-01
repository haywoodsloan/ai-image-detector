output "app_registration_id" {
  value = azuread_application_registration.app_registration.client_id
}

output "app_service_principal_id" {
  value = azuread_service_principal.app_service_principal.object_id
}

output "app_service_role_id" {
  value = azuread_application_app_role.invoker_role.role_id
}

output "app_service_secret" {
  value = azuread_application_password.dev_secret.value
  sensitive = true
}
