class AgentException(Exception):
    """
    Base exception for agent
    """

    def __init__(self, err_const: tuple, message: str = ""):
        self.code, const_message = err_const
        if message and message.strip():
            self.message = const_message + ":" + message
        else:
            self.message = const_message

        super().__init__(self.message)

    def __str__(self) -> str:
        return f"{self.__class__.__name__}: ({self.code}, {self.message})"

    def __repr__(self) -> str:
        return self.__str__()
