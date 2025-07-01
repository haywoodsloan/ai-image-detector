output "service_endpoint" {
  value = "https://${local.api_subdomain}.${local.domain_name}"
}

output "inference_endpoint" {
  value = "https://${module.appservice.appservice_hostname}/invoke"
}

output "inference_tenant_id" {
  value = data.azurerm_subscription.current.tenant_id
}

output "inference_reg_id" {
  value = module.ad.app_registration_id
}

output "inference_secret" {
  value = module.ad.app_service_secret
  sensitive = true
}

output "dns_nameservers" {
  value = module.dns.domain_ns
}

output "sub_id" {
  value = data.azurerm_subscription.current.subscription_id
}

output "db_name" {
  value = module.db.db_name
}

output "db_rg_name" {
  value = module.rg.env_rg_name
}

output "comm_endpoint" {
  value = module.comm.comm_service_endpoint
}

output "pubsub_hostnames" {
  value = { for name, region in module.region : name => region.pubsub_hostname }
}
