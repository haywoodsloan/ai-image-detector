variable "region_name" {
  type        = string
  description = "The cloud region to deploy to"
}

variable "env_name" {
  type        = string
  description = "The environment type (dev, prod, etc.)"
}

variable "hf_key" {
  type        = string
  description = "An access token for Hugging Face"
}

variable "db_name" {
  type        = string
  description = "The CosmosDB account name"
}

variable "db_id" {
  type        = string
  description = "The CosmosDB account ID"
}

variable "db_role_id" {
  type        = string
  description = "The CosmosDB role for fetching connection strings"
}

variable "comm_service_endpoint" {
  type        = string
  description = "The communication service endpoint"
}
variable "comm_service_id" {
  type        = string
  description = "The communication service ID"
}

variable "frontdoor_guid" {
  type        = string
  description = "The ID of the frontdoor for the function"
}

variable "api_subdomain" {
  type        = string
  description = "The subdomain for API calls"
}

variable "domain_name" {
  type        = string
  description = "The custom domain for API calls"
}

variable "env_rg_name" {
  type        = string
  description = "The name of the environemnt resource group"
}