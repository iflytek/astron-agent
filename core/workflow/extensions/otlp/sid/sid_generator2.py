"""
SID (Session ID) Generator Module for OTLP (OpenTelemetry Protocol) Extensions.

This module provides functionality to generate unique session identifiers
for distributed tracing and monitoring purposes in the 2.0 architecture.
"""

import os
import socket
import time

from loguru import logger

# Global SID generator instance
sid_generator2 = None


def init_sid(sub: str, location: str, localIp: str, localPort: str) -> None:
    """
    Initialize the global SID generator instance.

    :param sub: Subject identifier for the SID (e.g., service name)
    :param location: Location identifier for the SID (e.g., region or datacenter)
    :param localIp: Local IP address of the service
    :param localPort: Local port number of the service
    """
    global sid_generator2
    sid_generator2 = SidGenerator2(sub, location, localIp, localPort)


class SidGenerator2:
    """
    Session ID Generator for 2.0 Architecture.

    Generates unique session identifiers using a combination of:
    - Subject identifier
    - Process ID
    - Sequential index
    - Timestamp
    - Location
    - Local IP and port information
    """

    # Suffix identifier for 2.0 architecture
    sid2 = 2

    def __init__(self, sub: str, location: str, localIp: str, localPort: str) -> None:
        """
        Initialize the SID generator with service configuration.

        :param sub: Subject identifier for the SID
        :param location: Location identifier for the SID
        :param localIp: Local IP address (must be valid IPv4)
        :param localPort: Local port number (must be at least 4 characters)
        :raises ValueError: If IP address is invalid or port is too short
        """
        # Initialize sequential index counter
        self.index = 0

        # Parse and validate IP address
        ip = socket.inet_aton(localIp)
        if ip:
            # Extract the last two octets of the IP address
            ipSec3 = ip[2]
            ipSec4 = ip[3]
            ip3 = ipSec3 & 0xFF
            ip4 = ipSec4 & 0xFF
            # Create short IP representation using last two octets
            self.ShortLocalIP = f"{ip3:02x}{ip4:02x}"
        else:
            raise ValueError("Bad IP !! " + localIp)

        # Validate port number length
        if len(localPort) < 4:
            raise ValueError("Bad Port!! ")

        # Store configuration parameters
        self.port = localPort
        self.location = location
        self.sub = sub
        logger.debug("✅ SID generator initialized successfully")

    def gen(self) -> str:
        """
        Generate a unique session identifier.

        The SID format is: {sub}{pid}{index}@{location}{timestamp}{ip}{port}{version}

        :return: A unique session identifier string
        """
        # Use default subject if empty
        if len(self.sub) == 0:
            self.sub = "src"

        # Get process ID (limited to 8 bits)
        pid = os.getpid() & 0xFF

        # Increment and wrap index counter (16 bits)
        self.index = (self.index + 1) & 0xFFFF

        # Get current timestamp in milliseconds and convert to hex
        tm_int = int(time.time() * 1000)
        tm = format(tm_int, "011x")

        # Construct the complete SID
        sid = f"{self.sub}{pid:04x}{self.index:04x}@{self.location}{tm[-11:]}{self.ShortLocalIP}{self.port[:2]}{self.sid2}"
        return sid
