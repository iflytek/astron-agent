import os
from typing import Any, Optional

from celery import Celery, signals

from workflow.configs import workflow_config
from workflow.consts.runtime_env import RuntimeEnv
from workflow.extensions.middleware.base import FactoryConfig, ServiceType
from workflow.extensions.middleware.initialize import initialize_services

kafka_servers = workflow_config.kafka_config.kafka_servers
kafka_server = kafka_servers.split(",")[0]
runtime_env = os.getenv("RUNTIME_ENV", RuntimeEnv.Local.value).lower()


def get_task_queue_name() -> str:
    """Get the celery task queue name with runtime_env suffix."""
    return f"workflow_celery_task_queue_{runtime_env}"


app: Celery = Celery("celery-task-processor")
# Update Celery configuration
app.conf.update(
    # Task acknowledgement mechanism: True means ack is sent to broker only after task execution completes
    # If worker crashes, task will be redelivered to another worker
    task_acks_late=True,
    # Re-queue tasks when worker process terminates unexpectedly
    task_reject_on_worker_lost=True,
    # Use Confluent Kafka as message broker
    broker_url=f"confluentkafka://{kafka_server}/",
    # Kafka transport specific configuration
    broker_transport_options={
        # Kafka topic name
        "topic": f"workflow_celery_{runtime_env}",
        # Consumer group ID, workers in same group share task consumption
        "group.id": "celery-worker-group",
        # Message visibility timeout (seconds) - during this time message is invisible to other consumers
        "visibility_timeout": 300,
        # Kafka consumer configuration
        "consumer_config": {
            # Enable automatic offset committing
            "enable.auto.commit": False,
            # Maximum records per poll call
            "max.poll.records": 1,
            # Maximum poll interval (ms) - timeout will be considered as consumer dead
            "max.poll.interval.ms": 3000000,
            # Consumer session timeout (ms) - timeout will be considered as consumer dead
            "session.timeout.ms": workflow_config.kafka_config.kafka_session_timeout
            * 1000,
        },
        # Kafka common configuration
        "kafka_common_config": {
            # Security protocol: PLAINTEXT means no encryption
            "security.protocol": "PLAINTEXT",
            # Kafka cluster addresses
            "bootstrap.servers": kafka_servers,
        },
    },
    # Do not store task results (saves resources)
    result_backend=None,
    # Ignore task results
    task_ignore_result=True,
    # Task serialization format
    task_serializer="json",
    # Accepted content types
    accept_content=["json"],
    # Enable UTC time
    enable_utc=True,
    # Default queue name
    task_default_queue=get_task_queue_name(),
)


@signals.worker_process_init.connect
def on_worker_process_init(sender: Optional[Any] = None, **kwargs: Any) -> None:
    if os.getenv("CELERY_WORKER_POOL", "threads") == "prefork":
        initialize_services(
            [
                FactoryConfig(name=ServiceType.CACHE_SERVICE),
                FactoryConfig(name=ServiceType.DATABASE_SERVICE),
                FactoryConfig(name=ServiceType.KAFKA_PRODUCER_SERVICE),
                FactoryConfig(name=ServiceType.LOG_SERVICE),
                FactoryConfig(name=ServiceType.MASDK_SERVICE),
                FactoryConfig(name=ServiceType.OSS_SERVICE),
                FactoryConfig(name=ServiceType.OTLP_SERVICE),
                FactoryConfig(name=ServiceType.ASYNC_TASK_SERVICE),
            ]
        )


@signals.worker_ready.connect
def on_worker_ready(sender: Optional[Any] = None, **kwargs: Any) -> None:
    if os.getenv("CELERY_WORKER_POOL", "threads") == "threads":
        initialize_services(
            [
                FactoryConfig(name=ServiceType.CACHE_SERVICE),
                FactoryConfig(name=ServiceType.DATABASE_SERVICE),
                FactoryConfig(name=ServiceType.KAFKA_PRODUCER_SERVICE),
                FactoryConfig(name=ServiceType.LOG_SERVICE),
                FactoryConfig(name=ServiceType.MASDK_SERVICE),
                FactoryConfig(name=ServiceType.OSS_SERVICE),
                FactoryConfig(name=ServiceType.OTLP_SERVICE),
                FactoryConfig(name=ServiceType.ASYNC_TASK_SERVICE),
            ]
        )
