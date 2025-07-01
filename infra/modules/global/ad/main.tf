resource "azuread_application_registration" "app_registration" {
  display_name     = "AI Image Detector Model"
  sign_in_audience = "AzureADandPersonalMicrosoftAccount"
}

resource "azuread_service_principal" "app_service_principal" {
  client_id = azuread_application_registration.app_registration.client_id
}

resource "random_uuid" "invoker_role_uuid" {}
resource "azuread_application_app_role" "invoker_role" {
  application_id       = azuread_application_registration.app_registration.id
  role_id              = random_uuid.invoker_role_uuid.result
  allowed_member_types = ["Application", "User"]
  display_name         = "User"
  description          = "Invoke the model"
  value                = "User"
}

resource "random_uuid" "invoker_scope_uuid" {}
resource "azuread_application_permission_scope" "invoker_scope" {
  application_id = azuread_application_registration.app_registration.id
  scope_id       = random_uuid.invoker_scope_uuid.result

  value                      = "Invoke"
  admin_consent_display_name = "User"
  admin_consent_description  = "Allowed to invoke the model"
}

resource "azuread_application_pre_authorized" "azure_cli_allow" {
  application_id       = azuread_application_registration.app_registration.id
  authorized_client_id = "04b07795-8ddb-461a-bbee-02f9e1bf7b46"
  permission_ids       = [azuread_application_permission_scope.invoker_scope.scope_id]
}

resource "azuread_application_password" "dev_secret" {
  application_id = azuread_application_registration.app_registration.id
}
