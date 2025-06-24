resource "azuread_application_registration" "app_registration" {
  display_name = "AI Image Detector Model"
}

resource "azuread_service_principal" "app_service_principal" {
  client_id = azuread_application_registration.app_registration.client_id
}
