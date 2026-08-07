from typing import Any, Optional

from confluent_kafka import Producer  # type: ignore
from loguru import logger

from workflow.configs import workflow_config
from workflow.extensions.middleware.base import Service, ServiceType


class KafkaProducerService(Service):
    """
    Kafka producer service wrapper that provides a high-level interface for sending messages to Kafka topics.
    Encapsulates the confluent-kafka Producer with error handling and logging capabilities.
    """

    name = ServiceType.KAFKA_PRODUCER_SERVICE

    def __init__(self, config: dict):
        """
        Initialize the Kafka producer service with the provided configuration.

        :param config: Dictionary containing Kafka producer configuration parameters
        """
        self.config = config
        if not workflow_config.kafka_config.kafka_enable:
            logger.info("❌ Kafka is disabled")
        else:
            self.producer = Producer(**config)
            self._check_kafka_connection()

    def _check_kafka_connection(self) -> None:
        """
        Check if the Kafka connection is established.
        """
        try:
            self.producer.list_topics(timeout=10)
        except Exception as e:
            logger.error(f"Kafka connection check failed: {e}")
            raise e

    def send(
        self,
        topic: str,
        value: str,
        callback: Optional[Any] = None,
        timeout: int = workflow_config.kafka_config.kafka_timeout,
    ) -> None:
        """
        Send a message to the specified Kafka topic.

        :param topic: Target Kafka topic name
        :param value: Message content (serialized JSON string)
        :param callback: Optional callback function for delivery confirmation
        :param timeout: Poll timeout in seconds for message delivery
        :raises Exception: If message sending fails
        """

        if not workflow_config.kafka_config.kafka_enable:
            return

        # Use default delivery report callback if none provided
        if not callback:
            callback = self._delivery_report
        try:
            # Produce message to Kafka topic
            self.producer.produce(topic=topic, value=value, callback=callback)
            # Poll for delivery confirmation
            self.producer.poll(timeout)
        except Exception as e:
            logger.error(f"Kafka message send failed: {e}")
            raise e

    def _delivery_report(self, err: Optional[Any], msg: Any) -> None:
        """
        Default callback function for Kafka message delivery confirmation.
        Logs the delivery status of sent messages.

        :param err: Error object if message delivery failed, None if successful
        :param msg: Message object containing delivery information
        """
        if err is not None:
            logger.error("Message delivery failed: {}".format(err))
        else:
            logger.info(
                "Message delivered to {} [{}]".format(msg.topic(), msg.partition())
            )
