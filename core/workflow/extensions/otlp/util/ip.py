import socket


def get_host_ip() -> str:
    """
    Get the local machine's IP address by connecting to an external server.

    This function determines the local IP address by creating a UDP socket
    and connecting to Google's DNS server (8.8.8.8). The socket's local
    address is then retrieved, which represents the machine's IP address
    that would be used for external connections.

    :return: The local machine's IP address as a string
    :rtype: str
    """
    try:
        # Create a UDP socket for connection testing
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Connect to Google's DNS server to determine routing interface
        s.connect(("8.8.8.8", 80))
        # Get the local IP address that would be used for this connection
        ip = s.getsockname()[0]
    finally:
        # Ensure socket is properly closed
        s.close()

    return ip


# Get and store the host IP address at module level
ip = get_host_ip()
