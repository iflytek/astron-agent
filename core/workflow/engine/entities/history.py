from pydantic import BaseModel, Field

from workflow.domain.entities.chat import HistoryItem
from workflow.infra.providers.llm.iflytek_spark.schemas import SparkAiMessage


class History(BaseModel):
    """
    Manages conversation history with token and round limitations.
    """

    origin_history: list[HistoryItem] = []
    max_token: int = 2048
    rounds: int = 1

    def init_history(self, history: list[HistoryItem]) -> None:
        """
        Initialize the history with the provided history items.

        :param history: List of history items to initialize with
        """
        self.origin_history = history

    @staticmethod
    def process_history(data: list[HistoryItem], rounds: int) -> list[HistoryItem]:
        """
        Process history data with token and round limitations.

        :param data: List of history items to process
        :param max_token: Maximum token limit
        :param rounds: Maximum number of conversation rounds
        :return: Processed list of history items
        """
        if not data:
            return []
        array = data

        # Step 1: Classify images and other elements
        images, others = ProcessArrayMethod.process_image_array(array)

        # Step 2: Take the latest image only
        if images:
            images = [images[-1]]

        # Step 3: Group other messages in pairs (one round = 2 messages)
        others_group = ProcessArrayMethod.group_array_by_quantity(
            array=others, quantity=2
        )

        # Step 4: Limit by rounds
        array_after_rounds = ProcessArrayMethod.process_array_by_rounds(
            array=others_group, rounds=rounds
        )

        # Step 5: Combine history
        images.extend(ProcessArrayMethod.ungroup_array(array_after_rounds))
        return images

    @staticmethod
    def process_history_to_spark_message(
        array: list[HistoryItem],
    ) -> list[SparkAiMessage]:
        """
        Convert history items to Spark AI messages.

        :param array: List of history items to convert
        :return: List of Spark AI messages
        """
        history = []
        for item in array:
            history.append(
                SparkAiMessage(
                    content=item.content,
                    role=item.role,
                    content_type=(
                        item.content_type.value if item.content_type else "text"
                    ),
                )
            )
        return history


class ProcessArrayMethod:
    """
    Utility methods for array processing in history management.
    """

    @staticmethod
    def group_array_by_quantity(array: list, quantity: int) -> list:
        """
        Group array elements by specified quantity.

        :param array: Array to group
        :param quantity: Number of elements per group
        :return: Grouped array
        """
        return [array[i : i + quantity] for i in range(0, len(array), quantity)]

    @staticmethod
    def ungroup_array(array: list) -> list:
        """
        Flatten a grouped array back to a single list.

        :param array: Grouped array to flatten
        :return: Flattened array
        """
        return [item for sublist in array for item in sublist]

    @staticmethod
    def process_array_by_rounds(array: list, rounds: int) -> list:
        """
        Process array by limiting to the specified number of rounds.

        :param array: Array to process
        :param rounds: Maximum number of rounds to keep
        :return: Processed array with limited rounds
        """
        result: list = []
        if not array:
            return result
        delete_index = len(array) - rounds
        if delete_index < 0:
            result = array
        elif delete_index >= 0:
            result = array[delete_index:]
        return result

    @staticmethod
    def process_image_array(array: list[HistoryItem]) -> tuple[list, list]:
        """
        Separate image items from other items in the array.

        :param array: Array of history items to process
        :return: Tuple containing (images, others)
        """
        if not array:
            return [], []
        images = []
        others = []

        for item in array:
            if item.content_type == "image":
                images.append(item)
            else:
                others.append(item)
        return images, others


class EnableChatHistoryV2(BaseModel):
    """
    Enable chat history v2.

    :param is_enabled: Whether to enable chat history v2
    :param rounds: Maximum number of conversation rounds
    """

    is_enabled: bool = Field(default=False, alias="isEnabled")
    rounds: int = Field(default=1, gt=0, alias="rounds")
