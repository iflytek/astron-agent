from pydantic import BaseSettings, Field

class Settings(BaseSettings):
    rpa_api_endpoint: str = Field("http://localhost:8080/rpa", env="RPA_API_ENDPOINT")
    rpa_api_key: str = Field("", env="RPA_API_KEY")
    allowed_workflows: list = ["finance_reimbursement", "contract_entry", "core_system_modification"]
    audit_log_dir: str = "./audit_logs"

    class Config:
        env_file = ".env"

def get_settings():
    return Settings()
