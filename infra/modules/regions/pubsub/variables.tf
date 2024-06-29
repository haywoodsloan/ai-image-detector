variable "region_name" {
  type        = string
  description = "The cloud region to deploy this resource to"
}

variable "rg_name" {
  type        = string
  description = "The name of the resource group to deploy the function app to"
}