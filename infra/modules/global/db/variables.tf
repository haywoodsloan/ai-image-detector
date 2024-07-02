variable "region_names" {
  type        = list(string)
  description = "The cloud region to deploy this resource to"
}

variable "rg_name" {
  type        = string
  description = "The name of the resource group for the DB"
}
