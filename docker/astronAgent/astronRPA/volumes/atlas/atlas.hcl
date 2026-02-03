env "local" {
  url = "mysql://root:rpa123456@localhost:3306/rpa?charset=utf8mb4&parseTime=True"
  dev = "docker://mysql/8/dev"
  
  migration {
    dir = "file://migrations"
  }
}