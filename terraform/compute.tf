# Latest Amazon Linux 2023 AMI
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-kernel-*-x86_64"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

# Generate an ED25519 key pair locally
resource "tls_private_key" "phalanx" {
  algorithm = "ED25519"
}

resource "aws_key_pair" "phalanx" {
  key_name   = var.key_name
  public_key = tls_private_key.phalanx.public_key_openssh
}

# Save the private key locally for SSH access
resource "local_file" "private_key" {
  content         = tls_private_key.phalanx.private_key_openssh
  filename        = "${path.module}/${var.key_name}.pem"
  file_permission = "0400"
}

# EC2 instance
resource "aws_instance" "phalanx" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.phalanx.key_name
  vpc_security_group_ids = [aws_security_group.phalanx.id]
  subnet_id              = data.aws_subnets.default.ids[0]

  user_data = file("${path.module}/userdata.sh")

  root_block_device {
    volume_size = 8
    volume_type = "gp3"
  }

  tags = {
    Name    = "${var.project_name}-server"
    Project = var.project_name
  }
}

# Elastic IP — stable address that survives stop/start
resource "aws_eip" "phalanx" {
  domain = "vpc"

  tags = {
    Name    = "${var.project_name}-eip"
    Project = var.project_name
  }
}

resource "aws_eip_association" "phalanx" {
  instance_id   = aws_instance.phalanx.id
  allocation_id = aws_eip.phalanx.id
}
