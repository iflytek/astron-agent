class A2AError(Exception):
    pass

class AgentNotFoundError(A2AError):
    pass

class ProtocolError(A2AError):
    pass

class TransportError(A2AError):
    pass