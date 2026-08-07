from pydantic import BaseModel


class Usage(BaseModel):
    question_tokens: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
