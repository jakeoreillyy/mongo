output "elastic_ip" {
  description = "Public IP for the Phalanx server — share this with the team"
  value       = aws_eip.phalanx.public_ip
}

output "instance_id" {
  description = "EC2 instance ID"
  value       = aws_instance.phalanx.id
}

output "ssh_command" {
  description = "SSH command to connect to the server"
  value       = "ssh -i ${path.module}/${var.key_name}.pem ec2-user@${aws_eip.phalanx.public_ip}"
}

output "api_base_url" {
  description = "Base URL for the Express API"
  value       = "http://${aws_eip.phalanx.public_ip}"
}

output "ami_id" {
  description = "AMI used for the instance"
  value       = data.aws_ami.al2023.id
}

output "security_group_id" {
  description = "Security group ID"
  value       = aws_security_group.phalanx.id
}
